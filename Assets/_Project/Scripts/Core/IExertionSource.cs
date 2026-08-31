namespace TrenchSurvivor.Core
{
    /// <summary>Karakterin anlik eforu. Enerji tuketimi bu seviyeye gore olceklenir.</summary>
    public enum ExertionLevel
    {
        /// <summary>Duruyor veya cok yavas hareket ediyor.</summary>
        Resting = 0,

        /// <summary>Yuruyor veya surunuyor.</summary>
        Moving = 1,

        /// <summary>Kosuyor.</summary>
        Sprinting = 2
    }

    /// <summary>
    /// Efor bilgisini yayan bilesenler icin sozlesme.
    /// Hayatta kalma yoneticisinin hareket betigine dogrudan bagimli olmamasini saglar.
    /// </summary>
    public interface IExertionSource
    {
        /// <summary>Karakterin bu andaki efor seviyesi.</summary>
        ExertionLevel CurrentExertion { get; }
    }
}
