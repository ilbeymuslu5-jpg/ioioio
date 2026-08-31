namespace TrenchSurvivor.Core
{
    /// <summary>
    /// Hareket hizini disaridan etkileyen sistemler icin sozlesme
    /// (yorgunluk, sogugun etkisi, camur, yaralanma...).
    /// Hareket betiginin hayatta kalma sistemine dogrudan bagimli olmamasini saglar.
    /// </summary>
    public interface IMovementSpeedModifier
    {
        /// <summary>Taban hiz ile carpilan katsayi. 1 = etki yok, 0.5 = yari hiz.</summary>
        float MovementSpeedMultiplier { get; }
    }
}
