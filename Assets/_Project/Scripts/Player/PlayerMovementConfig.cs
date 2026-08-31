using UnityEngine;

namespace TrenchSurvivor.Player
{
    /// <summary>
    /// Hareket ayarlarini betikten ayiran veri varligi.
    /// Ayni betikle farkli karakterler (yarali asker, agir techizatli asker) uretilebilsin diye
    /// tum sayisal degerler burada tutulur.
    /// Menu: Create > Trench Survivor > Player Movement Config
    /// </summary>
    [CreateAssetMenu(fileName = "PlayerMovementConfig", menuName = "Trench Survivor/Player Movement Config", order = 1)]
    public class PlayerMovementConfig : ScriptableObject
    {
        [Header("X Ekseni Hizlari (metre/saniye)")]
        [Tooltip("Normal yurume hizi.")]
        [Min(0f)]
        [SerializeField] private float walkSpeed = 2.4f;

        [Tooltip("Kosma hizi; enerji tuketimini artirir.")]
        [Min(0f)]
        [SerializeField] private float runSpeed = 4.6f;

        [Tooltip("Surunerek ilerleme hizi.")]
        [Min(0f)]
        [SerializeField] private float crawlSpeed = 1.1f;

        [Tooltip("Hedef hiza ulasma sertligi. Yuksek deger daha ani, dusuk deger daha agir bir his verir.")]
        [Min(0.01f)]
        [SerializeField] private float acceleration = 12f;

        [Header("Z Ekseni - Serit Degistirme")]
        [Tooltip("Bir seritten digerine gecis suresi (saniye).")]
        [Min(0.05f)]
        [SerializeField] private float laneSwitchDuration = 0.28f;

        [Tooltip("Gecisin zamanlama egrisi; varsayilan yumusak giris-cikis.")]
        [SerializeField]
        private AnimationCurve laneSwitchEase = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);

        [Tooltip("Ard arda serit degistirmeyi engelleyen bekleme suresi (saniye).")]
        [Min(0f)]
        [SerializeField] private float laneSwitchCooldown = 0.12f;

        [Tooltip("Surunurken serit degistirilebilsin mi.")]
        [SerializeField] private bool allowLaneSwitchWhileCrawling = true;

        [Header("Durus / Collider")]
        [Tooltip("Surunurken CharacterController yuksekligi.")]
        [Min(0.1f)]
        [SerializeField] private float crawlHeight = 0.8f;

        [Header("Yer Cekimi")]
        [Tooltip("Uygulanan yer cekimi ivmesi (negatif deger).")]
        [SerializeField] private float gravity = -22f;

        [Tooltip("Yerdeyken karakteri zemine yapistiran kucuk kuvvet.")]
        [SerializeField] private float groundStickForce = -2f;

        [Header("Gorsel")]
        [Tooltip("Karakterin yon degistirme donus hizi (derece/saniye).")]
        [Min(0f)]
        [SerializeField] private float turnSpeed = 900f;

        public float WalkSpeed => walkSpeed;
        public float RunSpeed => runSpeed;
        public float CrawlSpeed => crawlSpeed;
        public float Acceleration => acceleration;
        public float LaneSwitchDuration => laneSwitchDuration;
        public AnimationCurve LaneSwitchEase => laneSwitchEase;
        public float LaneSwitchCooldown => laneSwitchCooldown;
        public bool AllowLaneSwitchWhileCrawling => allowLaneSwitchWhileCrawling;
        public float CrawlHeight => crawlHeight;
        public float Gravity => gravity;
        public float GroundStickForce => groundStickForce;
        public float TurnSpeed => turnSpeed;

        /// <summary>Durusa gore taban hizi dondurur (hayatta kalma carpani haric).</summary>
        public float GetSpeedForStance(MovementStance stance)
        {
            switch (stance)
            {
                case MovementStance.Running:
                    return runSpeed;
                case MovementStance.Crawling:
                    return crawlSpeed;
                default:
                    return walkSpeed;
            }
        }
    }
}
