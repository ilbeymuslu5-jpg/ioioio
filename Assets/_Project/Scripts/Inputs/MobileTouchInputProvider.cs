using UnityEngine;

namespace TrenchSurvivor.Inputs
{
    /// <summary>
    /// Mobil dokunmatik girdi saglayicisi.
    /// Ekranin sol yarisi: parmagin basildigi nokta joystick merkezi olur, yatay surukleme hareketi verir.
    /// Ekranin sag yarisi: dikey kaydirma (swipe) hareketi serit degistirir.
    /// Surunme, UI butonundan <see cref="SetCrawl"/> ile tetiklenir.
    /// </summary>
    public class MobileTouchInputProvider : MonoBehaviour, IPlayerInputProvider
    {
        [Header("Sanal Joystick")]
        [Tooltip("Joystick merkezinden itibaren tam hiza ulasilan mesafe (ekran genisliginin yuzdesi).")]
        [Range(0.02f, 0.30f)]
        [SerializeField] private float joystickRadiusPercent = 0.10f;

        [Tooltip("Bu esigin uzerindeki itme miktari kosma sayilir (0-1).")]
        [Range(0.4f, 1f)]
        [SerializeField] private float runThreshold = 0.75f;

        [Tooltip("Bu degerin altindaki itmeler yurume sayilmaz (olu bolge).")]
        [Range(0f, 0.5f)]
        [SerializeField] private float deadZone = 0.12f;

        [Header("Serit Kaydirma (Swipe)")]
        [Tooltip("Serit degisimi icin gereken minimum dikey kaydirma (ekran yuksekliginin yuzdesi).")]
        [Range(0.03f, 0.4f)]
        [SerializeField] private float swipeThresholdPercent = 0.08f;

        [Tooltip("Kaydirmanin gecerli sayilmasi icin izin verilen en uzun sure (saniye).")]
        [SerializeField] private float maxSwipeDuration = 0.6f;

        [Header("Editor / Masaustu Yedegi")]
        [Tooltip("Editorde klavye ile test edilebilsin diye acik birakilir.")]
        [SerializeField] private bool enableKeyboardFallback = true;

        // Aktif joystick parmaginin kimligi; -1 ise basili parmak yok.
        private int _moveFingerId = -1;
        private Vector2 _joystickOrigin;
        private float _horizontal;

        // Aktif kaydirma parmaginin takibi.
        private int _swipeFingerId = -1;
        private Vector2 _swipeStart;
        private float _swipeStartTime;

        private int _pendingLaneChange;
        private bool _crawlHeld;

        public float Horizontal => _horizontal;
        public bool RunHeld { get; private set; }
        public bool CrawlHeld => _crawlHeld;

        private void Update()
        {
            ReadTouches();

            if (enableKeyboardFallback)
            {
                ReadKeyboardFallback();
            }
        }

        /// <summary>UI butonundan cagrilir (Pointer Down/Up olaylari).</summary>
        public void SetCrawl(bool value)
        {
            _crawlHeld = value;
        }

        /// <summary>UI okundan veya harici sistemlerden serit degisimi tetiklemek icin.</summary>
        public void RequestLaneChange(int direction)
        {
            if (direction != 0)
            {
                _pendingLaneChange = direction > 0 ? 1 : -1;
            }
        }

        public bool TryConsumeLaneChange(out int direction)
        {
            direction = _pendingLaneChange;
            _pendingLaneChange = 0;
            return direction != 0;
        }

        private void ReadTouches()
        {
            if (Input.touchCount == 0)
            {
                // Tum parmaklar kalktiginda joystick sifirlanir.
                if (_moveFingerId != -1)
                {
                    ResetJoystick();
                }

                _swipeFingerId = -1;
                return;
            }

            float halfScreenWidth = Screen.width * 0.5f;

            for (int i = 0; i < Input.touchCount; i++)
            {
                Touch touch = Input.GetTouch(i);

                switch (touch.phase)
                {
                    case TouchPhase.Began:
                        // Sol yari hareket, sag yari serit kaydirmasi icin ayrilmistir.
                        if (touch.position.x < halfScreenWidth && _moveFingerId == -1)
                        {
                            _moveFingerId = touch.fingerId;
                            _joystickOrigin = touch.position;
                        }
                        else if (touch.position.x >= halfScreenWidth && _swipeFingerId == -1)
                        {
                            _swipeFingerId = touch.fingerId;
                            _swipeStart = touch.position;
                            _swipeStartTime = Time.unscaledTime;
                        }
                        break;

                    case TouchPhase.Moved:
                    case TouchPhase.Stationary:
                        if (touch.fingerId == _moveFingerId)
                        {
                            UpdateJoystick(touch.position);
                        }
                        break;

                    case TouchPhase.Ended:
                    case TouchPhase.Canceled:
                        if (touch.fingerId == _moveFingerId)
                        {
                            ResetJoystick();
                        }
                        else if (touch.fingerId == _swipeFingerId)
                        {
                            EvaluateSwipe(touch.position);
                            _swipeFingerId = -1;
                        }
                        break;
                }
            }
        }

        private void UpdateJoystick(Vector2 currentPosition)
        {
            float radiusInPixels = Mathf.Max(1f, Screen.width * joystickRadiusPercent);
            float rawAmount = (currentPosition.x - _joystickOrigin.x) / radiusInPixels;
            rawAmount = Mathf.Clamp(rawAmount, -1f, 1f);

            float magnitude = Mathf.Abs(rawAmount);
            if (magnitude < deadZone)
            {
                _horizontal = 0f;
                RunHeld = false;
                return;
            }

            // Olu bolge disindaki degeri tekrar 0-1 arasina yayiyoruz ki his lineer kalsin.
            float normalized = Mathf.InverseLerp(deadZone, 1f, magnitude);
            _horizontal = normalized * Mathf.Sign(rawAmount);
            RunHeld = magnitude >= runThreshold;
        }

        private void ResetJoystick()
        {
            _moveFingerId = -1;
            _horizontal = 0f;
            RunHeld = false;
        }

        private void EvaluateSwipe(Vector2 endPosition)
        {
            if (Time.unscaledTime - _swipeStartTime > maxSwipeDuration)
            {
                return;
            }

            Vector2 delta = endPosition - _swipeStart;
            float thresholdInPixels = Screen.height * swipeThresholdPercent;

            // Yatay kaydirmalar hareket olarak degerlendirildigi icin sadece baskin dikey hareketi kabul ediyoruz.
            if (Mathf.Abs(delta.y) < thresholdInPixels || Mathf.Abs(delta.y) <= Mathf.Abs(delta.x))
            {
                return;
            }

            // Yukari kaydirma arka siper hattina, asagi kaydirma on siper hattina gecirir.
            RequestLaneChange(delta.y > 0f ? 1 : -1);
        }

        private void ReadKeyboardFallback()
        {
            float keyboardHorizontal = Input.GetAxisRaw("Horizontal");
            if (!Mathf.Approximately(keyboardHorizontal, 0f))
            {
                _horizontal = keyboardHorizontal;
                RunHeld = Input.GetKey(KeyCode.LeftShift);
            }

            if (Input.GetKey(KeyCode.LeftControl))
            {
                _crawlHeld = true;
            }
            else if (Input.GetKeyUp(KeyCode.LeftControl))
            {
                _crawlHeld = false;
            }

            if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow))
            {
                RequestLaneChange(1);
            }
            else if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow))
            {
                RequestLaneChange(-1);
            }
        }
    }
}
