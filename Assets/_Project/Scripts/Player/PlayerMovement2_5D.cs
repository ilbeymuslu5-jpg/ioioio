using TrenchSurvivor.Core;
using TrenchSurvivor.Inputs;
using UnityEngine;

namespace TrenchSurvivor.Player
{
    /// <summary>
    /// 2.5D karakter kontrolcusu.
    /// X ekseninde yurume/kosma/surunme, Z ekseninde siper hatlari (lane) arasi gecis saglar.
    /// Girdi kaynagi ve hiz ayarlari disaridan enjekte edildigi icin betik moduler kalir.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerMovement2_5D : MonoBehaviour, IExertionSource
    {
        [Header("Bagimliliklar")]
        [Tooltip("Serit tablosu. Dusman yapay zekasi ile ayni varlik kullanilmalidir.")]
        [SerializeField] private LaneGrid laneGrid;

        [Tooltip("Hiz ve gecis sureleri gibi ayarlarin tutuldugu veri varligi.")]
        [SerializeField] private PlayerMovementConfig config;

        [Tooltip("IPlayerInputProvider uygulayan bilesen (mobilde MobileTouchInputProvider).")]
        [SerializeField] private MonoBehaviour inputProviderSource;

        [Tooltip("IMovementSpeedModifier uygulayan bilesen (SurvivalStatsManager). Bos birakilabilir.")]
        [SerializeField] private MonoBehaviour speedModifierSource;

        [Header("Gorsel")]
        [Tooltip("Yon degistirirken dondurulecek model koku. Bos ise donus uygulanmaz.")]
        [SerializeField] private Transform visualRoot;

        [Tooltip("Istege bagli animator. Speed, Stance ve LaneSwitch parametreleri beslenir.")]
        [SerializeField] private Animator animator;

        [Header("Serit Engel Kontrolu")]
        [Tooltip("Serit degisimini engelleyen katmanlar (duvar, kum torbasi, dikenli tel).")]
        [SerializeField] private LayerMask laneObstacleMask = ~0;

        [Tooltip("Hedef seritte engel kontrolu yapilsin mi.")]
        [SerializeField] private bool checkLaneObstacles = true;

        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int StanceHash = Animator.StringToHash("Stance");
        private static readonly int LaneSwitchHash = Animator.StringToHash("LaneSwitch");

        private CharacterController _controller;
        private IPlayerInputProvider _input;
        private IMovementSpeedModifier _speedModifier;

        // Ayakta durusa geri donebilmek icin baslangic collider olculeri saklanir.
        private float _standingHeight;
        private Vector3 _standingCenter;

        private float _currentHorizontalSpeed;
        private float _verticalVelocity;
        private float _facingSign = 1f;

        // Serit gecisi durumu.
        private int _currentLane;
        private float _laneTransitionTimer;
        private float _laneTransitionStartZ;
        private float _laneTransitionTargetZ;
        private bool _isSwitchingLane;
        private float _laneSwitchCooldownTimer;

        private MovementStance _stance = MovementStance.Walking;

        /// <summary>Oyuncunun bulundugu serit indeksi (0 = kameraya en yakin hat).</summary>
        public int CurrentLane => _currentLane;

        /// <summary>Serit gecisi devam ediyor mu (bu sirada nisan alma kilitlenebilir).</summary>
        public bool IsSwitchingLane => _isSwitchingLane;

        /// <summary>Anlik durus.</summary>
        public MovementStance Stance => _stance;

        /// <summary>Animasyon karistirma icin 0-1 arasi normalize hiz.</summary>
        public float NormalizedSpeed
        {
            get
            {
                float reference = config != null ? Mathf.Max(0.01f, config.RunSpeed) : 1f;
                return Mathf.Clamp01(Mathf.Abs(_currentHorizontalSpeed) / reference);
            }
        }

        /// <summary>Karakterin baktigi yon (+1 sag, -1 sol).</summary>
        public float FacingSign => _facingSign;

        /// <summary>
        /// Hayatta kalma sisteminin okudugu efor seviyesi.
        /// Kosmak enerjiyi hizli tuketirken, durmak tuketimi taban seviyede tutar.
        /// </summary>
        public ExertionLevel CurrentExertion
        {
            get
            {
                if (Mathf.Abs(_currentHorizontalSpeed) < 0.05f)
                {
                    return ExertionLevel.Resting;
                }

                return _stance == MovementStance.Running ? ExertionLevel.Sprinting : ExertionLevel.Moving;
            }
        }

        /// <summary>Serit degistiginde tetiklenir (yeni serit indeksi).</summary>
        public event System.Action<int> LaneChanged;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
            _standingHeight = _controller.height;
            _standingCenter = _controller.center;

            ResolveDependencies();
        }

        private void Start()
        {
            // Karakter, sahnedeki baslangic derinligine en yakin seride hizalanir.
            if (laneGrid != null)
            {
                SnapToLane(laneGrid.GetNearestLane(transform.position.z));
            }
        }

        private void Update()
        {
            if (config == null || _input == null)
            {
                return;
            }

            float deltaTime = Time.deltaTime;

            UpdateStance();
            HandleLaneInput(deltaTime);

            Vector3 motion = Vector3.zero;
            motion.x = CalculateHorizontalMotion(deltaTime);
            motion.z = CalculateLaneMotion(deltaTime);
            motion.y = CalculateVerticalMotion(deltaTime);

            _controller.Move(motion);

            UpdateFacing(deltaTime);
            UpdateAnimator();
        }

        /// <summary>Hedef seride yumusak gecis baslatir. Engel varsa false doner.</summary>
        public bool RequestLane(int targetLane)
        {
            if (laneGrid == null || config == null)
            {
                return false;
            }

            targetLane = laneGrid.ClampLane(targetLane);
            if (targetLane == _currentLane)
            {
                return false;
            }

            if (_isSwitchingLane || _laneSwitchCooldownTimer > 0f)
            {
                return false;
            }

            if (_stance == MovementStance.Crawling && !config.AllowLaneSwitchWhileCrawling)
            {
                return false;
            }

            float targetZ = laneGrid.GetLaneDepth(targetLane);
            if (checkLaneObstacles && IsLaneBlocked(targetZ))
            {
                return false;
            }

            _currentLane = targetLane;
            _laneTransitionStartZ = transform.position.z;
            _laneTransitionTargetZ = targetZ;
            _laneTransitionTimer = 0f;
            _isSwitchingLane = true;

            if (animator != null)
            {
                animator.SetTrigger(LaneSwitchHash);
            }

            LaneChanged?.Invoke(_currentLane);
            return true;
        }

        /// <summary>Gecis animasyonu olmadan seride isinlar (dogus, kesme sahnesi, checkpoint).</summary>
        public void SnapToLane(int targetLane)
        {
            if (laneGrid == null)
            {
                return;
            }

            _currentLane = laneGrid.ClampLane(targetLane);
            _isSwitchingLane = false;
            _laneTransitionTimer = 0f;

            Vector3 position = transform.position;
            position.z = laneGrid.GetLaneDepth(_currentLane);

            // CharacterController acikken transform'a dogrudan yazmak collider'i bozar,
            // bu yuzden kisa sureligine kapatiyoruz.
            bool wasEnabled = _controller.enabled;
            _controller.enabled = false;
            transform.position = position;
            _controller.enabled = wasEnabled;

            LaneChanged?.Invoke(_currentLane);
        }

        /// <summary>Girdi saglayicisini calisma aninda degistirir (ornegin kesme sahnelerinde).</summary>
        public void SetInputProvider(IPlayerInputProvider provider)
        {
            _input = provider;
        }

        private void ResolveDependencies()
        {
            _input = inputProviderSource as IPlayerInputProvider;
            if (_input == null)
            {
                _input = GetComponent<IPlayerInputProvider>();
            }

            if (_input == null)
            {
                Debug.LogError($"[{nameof(PlayerMovement2_5D)}] IPlayerInputProvider bulunamadi.", this);
            }

            _speedModifier = speedModifierSource as IMovementSpeedModifier;
            if (_speedModifier == null)
            {
                _speedModifier = GetComponent<IMovementSpeedModifier>();
            }

            if (config == null)
            {
                Debug.LogError($"[{nameof(PlayerMovement2_5D)}] PlayerMovementConfig atanmamis.", this);
            }

            if (laneGrid == null)
            {
                Debug.LogError($"[{nameof(PlayerMovement2_5D)}] LaneGrid atanmamis.", this);
            }
        }

        private void UpdateStance()
        {
            bool wantsCrawl = _input.CrawlHeld;

            // Surunmeden kalkarken tepede engel varsa ayaga kalkmaya izin verilmez.
            if (!wantsCrawl && _stance == MovementStance.Crawling && IsBlockedAbove())
            {
                wantsCrawl = true;
            }

            if (wantsCrawl)
            {
                _stance = MovementStance.Crawling;
            }
            else if (_input.RunHeld && Mathf.Abs(_input.Horizontal) > 0.01f)
            {
                _stance = MovementStance.Running;
            }
            else
            {
                _stance = MovementStance.Walking;
            }

            ApplyColliderForStance();
        }

        private void ApplyColliderForStance()
        {
            float targetHeight = _stance == MovementStance.Crawling
                ? Mathf.Min(config.CrawlHeight, _standingHeight)
                : _standingHeight;

            if (Mathf.Approximately(_controller.height, targetHeight))
            {
                return;
            }

            _controller.height = targetHeight;

            // Merkez, ayaklar ayni yerde kalacak sekilde asagi kaydirilir.
            Vector3 center = _standingCenter;
            center.y = _standingCenter.y - (_standingHeight - targetHeight) * 0.5f;
            _controller.center = center;
        }

        private void HandleLaneInput(float deltaTime)
        {
            if (_laneSwitchCooldownTimer > 0f)
            {
                _laneSwitchCooldownTimer -= deltaTime;
            }

            if (_input.TryConsumeLaneChange(out int direction))
            {
                RequestLane(_currentLane + direction);
            }
        }

        private float CalculateHorizontalMotion(float deltaTime)
        {
            float input = Mathf.Clamp(_input.Horizontal, -1f, 1f);
            float speedMultiplier = _speedModifier?.MovementSpeedMultiplier ?? 1f;
            float targetSpeed = input * config.GetSpeedForStance(_stance) * Mathf.Max(0f, speedMultiplier);

            _currentHorizontalSpeed = Mathf.MoveTowards(
                _currentHorizontalSpeed,
                targetSpeed,
                config.Acceleration * deltaTime);

            return _currentHorizontalSpeed * deltaTime;
        }

        private float CalculateLaneMotion(float deltaTime)
        {
            if (!_isSwitchingLane)
            {
                return 0f;
            }

            _laneTransitionTimer += deltaTime;
            float progress = Mathf.Clamp01(_laneTransitionTimer / config.LaneSwitchDuration);
            float eased = config.LaneSwitchEase != null ? config.LaneSwitchEase.Evaluate(progress) : progress;

            float desiredZ = Mathf.LerpUnclamped(_laneTransitionStartZ, _laneTransitionTargetZ, eased);
            float delta = desiredZ - transform.position.z;

            if (progress >= 1f)
            {
                _isSwitchingLane = false;
                _laneSwitchCooldownTimer = config.LaneSwitchCooldown;
            }

            return delta;
        }

        private float CalculateVerticalMotion(float deltaTime)
        {
            if (_controller.isGrounded && _verticalVelocity < 0f)
            {
                // Zemin algisinin kararli kalmasi icin kucuk bir negatif hiz korunur.
                _verticalVelocity = config.GroundStickForce;
            }
            else
            {
                _verticalVelocity += config.Gravity * deltaTime;
            }

            return _verticalVelocity * deltaTime;
        }

        private void UpdateFacing(float deltaTime)
        {
            if (Mathf.Abs(_input.Horizontal) > 0.01f)
            {
                _facingSign = Mathf.Sign(_input.Horizontal);
            }

            if (visualRoot == null)
            {
                return;
            }

            // Yan bakisli kamerada model +X veya -X yonune bakar.
            Quaternion targetRotation = Quaternion.LookRotation(new Vector3(_facingSign, 0f, 0f), Vector3.up);
            visualRoot.rotation = Quaternion.RotateTowards(
                visualRoot.rotation,
                targetRotation,
                config.TurnSpeed * deltaTime);
        }

        private void UpdateAnimator()
        {
            if (animator == null)
            {
                return;
            }

            animator.SetFloat(SpeedHash, NormalizedSpeed);
            animator.SetInteger(StanceHash, (int)_stance);
        }

        private bool IsLaneBlocked(float targetZ)
        {
            Vector3 targetPosition = transform.position;
            targetPosition.z = targetZ;

            // Hedef seritteki kapsul hacmi doluysa gecis iptal edilir.
            float radius = Mathf.Max(0.01f, _controller.radius - _controller.skinWidth);
            float halfSpan = Mathf.Max(0f, _controller.height * 0.5f - radius);
            Vector3 center = targetPosition + _controller.center;
            Vector3 bottom = center - Vector3.up * halfSpan;
            Vector3 top = center + Vector3.up * halfSpan;

            return Physics.CheckCapsule(bottom, top, radius, laneObstacleMask, QueryTriggerInteraction.Ignore);
        }

        private bool IsBlockedAbove()
        {
            // Ayaga kalkinca kaplanacak hacimde engel var mi diye bakilir.
            float radius = Mathf.Max(0.01f, _controller.radius - _controller.skinWidth);
            Vector3 feet = transform.position + _controller.center - Vector3.up * (_controller.height * 0.5f);
            Vector3 bottom = feet + Vector3.up * radius;
            Vector3 top = feet + Vector3.up * (_standingHeight - radius);

            return Physics.CheckCapsule(bottom, top, radius, laneObstacleMask, QueryTriggerInteraction.Ignore);
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            if (laneGrid == null)
            {
                return;
            }

            // Seritleri editorde gorsellestirerek seviye tasarimini kolaylastirir.
            Gizmos.color = new Color(0.9f, 0.7f, 0.2f, 0.8f);
            for (int i = 0; i < laneGrid.LaneCount; i++)
            {
                Vector3 center = new Vector3(transform.position.x, transform.position.y, laneGrid.GetLaneDepth(i));
                Gizmos.DrawWireSphere(center, 0.25f);
                Gizmos.DrawLine(center + Vector3.left * 6f, center + Vector3.right * 6f);
            }
        }
#endif
    }
}
