using UnityEngine;

namespace TrenchSurvivor.Survival
{
    /// <summary>
    /// Hayatta kalma dengesinin (balance) tutuldugu veri varligi.
    /// Zorluk seviyeleri icin farkli varliklar uretilip calisma aninda degistirilebilir.
    /// Menu: Create > Trench Survivor > Survival Config
    /// </summary>
    [CreateAssetMenu(fileName = "SurvivalConfig", menuName = "Trench Survivor/Survival Config", order = 2)]
    public class SurvivalConfig : ScriptableObject
    {
        [Header("Guncelleme")]
        [Tooltip("Hayatta kalma hesaplarinin kac saniyede bir yapilacagi. Mobilde pil tuketimini dusurur.")]
        [Range(0.05f, 1f)]
        [SerializeField] private float tickInterval = 0.25f;

        [Header("Vucut Isisi / Enerji")]
        [Tooltip("Saniyede tukenen taban enerji miktari.")]
        [Min(0f)]
        [SerializeField] private float energyDrainPerSecond = 0.35f;

        [Tooltip("Gece bu carpanla daha hizli usunur.")]
        [Min(1f)]
        [SerializeField] private float nightDrainMultiplier = 2f;

        [Tooltip("Camurda ilerlerken uygulanan ek tuketim carpani.")]
        [Min(1f)]
        [SerializeField] private float mudDrainMultiplier = 1.6f;

        [Tooltip("Kosarken uygulanan ek tuketim carpani.")]
        [Min(1f)]
        [SerializeField] private float sprintDrainMultiplier = 2.2f;

        [Tooltip("Ates basinda saniyede kazanilan enerji.")]
        [Min(0f)]
        [SerializeField] private float heatSourceRegenPerSecond = 6f;

        [Header("Enerjinin Hiza Etkisi")]
        [Tooltip("Bu normalize enerjinin uzerinde hiz cezasi uygulanmaz.")]
        [Range(0f, 1f)]
        [SerializeField] private float comfortableEnergyThreshold = 0.5f;

        [Tooltip("Enerji tamamen bittiginde uygulanacak en dusuk hiz carpani.")]
        [Range(0.1f, 1f)]
        [SerializeField] private float minSpeedMultiplier = 0.45f;

        [Header("Enerji Tukenmesinin Cani Etkilemesi")]
        [Tooltip("Enerji sifirken saniyede alinan bitkinlik hasari.")]
        [Min(0f)]
        [SerializeField] private float exhaustionDamagePerSecond = 1.5f;

        [Header("Gaz Maskesi")]
        [Tooltip("Gaz bulutu icindeyken saniyede tukenen filtre miktari.")]
        [Min(0f)]
        [SerializeField] private float filterDrainPerSecond = 4f;

        [Tooltip("Maske takili degilken veya filtre bittiginde saniyede alinan gaz hasari.")]
        [Min(0f)]
        [SerializeField] private float gasDamagePerSecond = 9f;

        [Tooltip("Gaz bulutu disinda filtrenin kendi kendine tazelenip tazelenmedigi.")]
        [SerializeField] private bool filterRecoversOutsideGas = false;

        [Tooltip("Filtrenin gaz disinda saniyede tazelenme miktari (yukaridaki secenek acikken).")]
        [Min(0f)]
        [SerializeField] private float filterRecoveryPerSecond = 1f;

        [Header("Iyilesme")]
        [Tooltip("Sargi bezi uygulandiktan sonra saniyede iyilesen can.")]
        [Min(0f)]
        [SerializeField] private float bandageHealPerSecond = 8f;

        public float TickInterval => tickInterval;
        public float EnergyDrainPerSecond => energyDrainPerSecond;
        public float NightDrainMultiplier => nightDrainMultiplier;
        public float MudDrainMultiplier => mudDrainMultiplier;
        public float SprintDrainMultiplier => sprintDrainMultiplier;
        public float HeatSourceRegenPerSecond => heatSourceRegenPerSecond;
        public float ComfortableEnergyThreshold => comfortableEnergyThreshold;
        public float MinSpeedMultiplier => minSpeedMultiplier;
        public float ExhaustionDamagePerSecond => exhaustionDamagePerSecond;
        public float FilterDrainPerSecond => filterDrainPerSecond;
        public float GasDamagePerSecond => gasDamagePerSecond;
        public bool FilterRecoversOutsideGas => filterRecoversOutsideGas;
        public float FilterRecoveryPerSecond => filterRecoveryPerSecond;
        public float BandageHealPerSecond => bandageHealPerSecond;
    }
}
