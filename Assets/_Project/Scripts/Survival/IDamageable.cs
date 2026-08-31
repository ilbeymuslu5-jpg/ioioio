namespace TrenchSurvivor.Survival
{
    /// <summary>Hasar alabilen her varlik (oyuncu, dusman, sandik) bu arayuzu uygular.</summary>
    public interface IDamageable
    {
        /// <summary>Hedef hala hayatta mi.</summary>
        bool IsAlive { get; }

        /// <summary>Hedefe hasar uygular.</summary>
        void TakeDamage(float amount, DamageType damageType);
    }
}
