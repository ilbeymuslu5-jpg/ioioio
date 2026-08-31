using System;
using TrenchSurvivor.Core;
using UnityEngine;

namespace TrenchSurvivor.Survival
{
    /// <summary>
    /// Can, vucut isisi/enerji ve gaz maskesi filtresini yoneten merkezi sistem.
    /// Cevresel etkiler (gaz bulutu, camur, gece, ates basi) tetikleyici bolgelerden
    /// sayac tabanli olarak bildirilir; boylece ust uste binen bolgeler dogru calisir.
    /// </summary>
    [DisallowMultipleComponent]
    public class SurvivalStatsManager : MonoBehaviour, IDamageable, IMovementSpeedModifier
    {
        [Header("Ayarlar")]
        [Tooltip("Denge degerlerinin tutuldugu veri varligi.")]
        [SerializeField] private SurvivalConfig config;

        [Tooltip("Efor bilgisini saglayan bilesen (PlayerMovement2_5D). Bos birakilabilir.")]
        [SerializeField] private MonoBehaviour exertionSource;

        [Header("Istatistikler")]
        [Tooltip("Can. Catisma, patlama ve gazdan etkilenir; sargi bezi ile dolar.")]
        [SerializeField] private SurvivalStat health = new SurvivalStat();

        [Tooltip("Vucut isisi / enerji. Gece ve camurda hizla duser, hizi yavaslatir.")]
        [SerializeField] private SurvivalStat energy = new SurvivalStat();

        [Tooltip("Gaz maskesi filtresi. Sadece gaz bulutu icinde tukenir.")]
        [SerializeField] private SurvivalStat gasFilter = new SurvivalStat();

        [Header("Baslangic Durumu")]
        [Tooltip("Oyuncu maskeyi takili olarak mi basliyor.")]
        [SerializeField] private bool maskEquipped = true;

        [Tooltip("Sahne gece olarak mi basliyor.")]
        [SerializeField] private bool isNight = false;

        /// <summary>Tek erisim noktasi; HUD ve olay sistemleri buradan okur.</summary>
        public static SurvivalStatsManager Instance { get; private set; }

        // Ust uste binen tetikleyici bolgeleri dogru saymak icin sayaclar kullanilir.
        private int _gasZoneCount;
        private int _mudZoneCount;
        private int _heatSourceCount;

        private IExertionSource _exertion;
        private float _tickTimer;
        private float _pendingHeal;
        private bool _isAlive = true;

        public SurvivalStat Health => health;
        public SurvivalStat Energy => energy;
        public SurvivalStat GasFilter => gasFilter;

        public bool IsAlive => _isAlive;
        public bool IsMaskEquipped => maskEquipped;
        public bool IsNight => isNight;
        public bool IsInGas => _gasZoneCount > 0;
        public bool IsInMud => _mudZoneCount > 0;
        public bool IsNearHeatSource => _heatSourceCount > 0;

        /// <summary>Oyuncu oldugunde bir kez tetiklenir.</summary>
        public event Action Died;

        /// <summary>Hasar alindiginda tetiklenir (miktar, tur). Ekran efektleri icin kullanilir.</summary>
        public event Action<float, DamageType> DamageTaken;

        /// <summary>Maske takildiginda/cikarildiginda tetiklenir.</summary>
        public event Action<bool> MaskStateChanged;

        /// <summary>
        /// Enerji dustukce hareket hizini azaltan carpan.
        /// Konfor esiginin uzerinde 1, enerji bittiginde en dusuk degere iner.
        /// </summary>
        public float MovementSpeedMultiplier
        {
            get
            {
                if (!_isAlive)
                {
                    return 0f;
                }

                if (config == null)
                {
                    return 1f;
                }

                float threshold = Mathf.Max(0.01f, config.ComfortableEnergyThreshold);
                float t = Mathf.Clamp01(energy.Normalized / threshold);
                return Mathf.Lerp(config.MinSpeedMultiplier, 1f, t);
            }
        }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Debug.LogWarning($"[{nameof(SurvivalStatsManager)}] Sahnede birden fazla ornek var; fazlasi kapatildi.", this);
                enabled = false;
                return;
            }

            Instance = this;

            health.Initialize();
            energy.Initialize();
            gasFilter.Initialize();

            _exertion = exertionSource as IExertionSource;
            if (_exertion == null)
            {
                _exertion = GetComponent<IExertionSource>();
            }

            if (config == null)
            {
                Debug.LogError($"[{nameof(SurvivalStatsManager)}] SurvivalConfig atanmamis.", this);
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Update()
        {
            if (!_isAlive || config == null)
            {
                return;
            }

            // Her karede degil, sabit araliklarla hesaplayarak mobil performansi koruyoruz.
            _tickTimer += Time.deltaTime;
            if (_tickTimer < config.TickInterval)
            {
                return;
            }

            float delta = _tickTimer;
            _tickTimer = 0f;

            ProcessEnergy(delta);
            ProcessGas(delta);
            ProcessHealing(delta);
        }

        #region Disaridan Cagrilan Islemler

        /// <inheritdoc />
        public void TakeDamage(float amount, DamageType damageType)
        {
            if (!_isAlive || amount <= 0f)
            {
                return;
            }

            health.Consume(amount);
            DamageTaken?.Invoke(amount, damageType);

            if (health.IsEmpty)
            {
                Die();
            }
        }

        /// <summary>Sargi bezi uygular; can zamana yayilarak dolar.</summary>
        public void ApplyBandage(float totalHealAmount)
        {
            if (!_isAlive || totalHealAmount <= 0f)
            {
                return;
            }

            _pendingHeal += totalHealAmount;
        }

        /// <summary>Konserve/erzak tuketir; vucut isisini ve enerjiyi yukseltir.</summary>
        public void ConsumeRation(float energyAmount)
        {
            if (!_isAlive)
            {
                return;
            }

            energy.Add(energyAmount);
        }

        /// <summary>Yeni gaz maskesi filtresi takar.</summary>
        public void ReplaceFilter(float filterAmount)
        {
            if (!_isAlive)
            {
                return;
            }

            gasFilter.Add(filterAmount);
        }

        /// <summary>Maskeyi takar veya cikarir (maske takiliyken nisan alma zorlasabilir).</summary>
        public void SetMaskEquipped(bool equipped)
        {
            if (maskEquipped == equipped)
            {
                return;
            }

            maskEquipped = equipped;
            MaskStateChanged?.Invoke(maskEquipped);
        }

        /// <summary>Gunduz/gece dongusunden cagrilir.</summary>
        public void SetNight(bool value)
        {
            isNight = value;
        }

        /// <summary>Gaz bulutu tetikleyicisine girildiginde cagrilir.</summary>
        public void EnterGasZone() => _gasZoneCount++;

        /// <summary>Gaz bulutundan cikildiginda cagrilir.</summary>
        public void ExitGasZone() => _gasZoneCount = Mathf.Max(0, _gasZoneCount - 1);

        /// <summary>Camur alanina girildiginde cagrilir.</summary>
        public void EnterMudZone() => _mudZoneCount++;

        /// <summary>Camur alanindan cikildiginda cagrilir.</summary>
        public void ExitMudZone() => _mudZoneCount = Mathf.Max(0, _mudZoneCount - 1);

        /// <summary>Ates/isi kaynagi menziline girildiginde cagrilir.</summary>
        public void EnterHeatSource() => _heatSourceCount++;

        /// <summary>Isi kaynagi menzilinden cikildiginda cagrilir.</summary>
        public void ExitHeatSource() => _heatSourceCount = Mathf.Max(0, _heatSourceCount - 1);

        /// <summary>Tum degerleri baslangica dondurur (yeniden dogus / bolum tekrari).</summary>
        public void ResetStats()
        {
            health.Initialize();
            energy.Initialize();
            gasFilter.Initialize();

            _gasZoneCount = 0;
            _mudZoneCount = 0;
            _heatSourceCount = 0;
            _pendingHeal = 0f;
            _tickTimer = 0f;
            _isAlive = true;
        }

        #endregion

        #region Dahili Hesaplamalar

        private void ProcessEnergy(float delta)
        {
            if (IsNearHeatSource)
            {
                // Ates basinda isinmak tuketimi durdurur ve enerjiyi geri yukler.
                energy.Add(config.HeatSourceRegenPerSecond * delta);
                return;
            }

            float drain = config.EnergyDrainPerSecond;

            if (isNight)
            {
                drain *= config.NightDrainMultiplier;
            }

            if (IsInMud)
            {
                drain *= config.MudDrainMultiplier;
            }

            if (_exertion != null && _exertion.CurrentExertion == ExertionLevel.Sprinting)
            {
                drain *= config.SprintDrainMultiplier;
            }

            energy.Consume(drain * delta);

            // Enerji tamamen bittiginde bitkinlik cani yemeye baslar.
            if (energy.IsEmpty)
            {
                TakeDamage(config.ExhaustionDamagePerSecond * delta, DamageType.Exhaustion);
            }
        }

        private void ProcessGas(float delta)
        {
            if (IsInGas)
            {
                if (maskEquipped && !gasFilter.IsEmpty)
                {
                    // Maske korurken sadece filtre tukenir.
                    gasFilter.Consume(config.FilterDrainPerSecond * delta);
                }
                else
                {
                    // Maske yoksa veya filtre bittiyse gaz dogrudan cana isler.
                    TakeDamage(config.GasDamagePerSecond * delta, DamageType.Gas);
                }

                return;
            }

            if (config.FilterRecoversOutsideGas && !gasFilter.IsFull)
            {
                gasFilter.Add(config.FilterRecoveryPerSecond * delta);
            }
        }

        private void ProcessHealing(float delta)
        {
            if (_pendingHeal <= 0f)
            {
                return;
            }

            float step = Mathf.Min(_pendingHeal, config.BandageHealPerSecond * delta);
            _pendingHeal -= step;
            health.Add(step);
        }

        private void Die()
        {
            if (!_isAlive)
            {
                return;
            }

            _isAlive = false;
            _pendingHeal = 0f;
            Died?.Invoke();
        }

        #endregion
    }
}
