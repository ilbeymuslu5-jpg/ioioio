namespace TrenchSurvivor.Survival
{
    /// <summary>Hasarin kaynagi. Zirh, animasyon ve ses tepkileri buna gore secilir.</summary>
    public enum DamageType
    {
        /// <summary>Genel/tanimsiz hasar.</summary>
        Generic = 0,

        /// <summary>Tufek ve makineli tufek atesi.</summary>
        Bullet = 1,

        /// <summary>Topcu atisi ve el bombasi sarapneli.</summary>
        Explosion = 2,

        /// <summary>Hardal gazi; maske filtresi bittiginde uygulanir.</summary>
        Gas = 3,

        /// <summary>Sogugun ve aclikin yol actigi yipranma.</summary>
        Exhaustion = 4,

        /// <summary>Yakin dovus (kasatura, kazma).</summary>
        Melee = 5
    }
}
