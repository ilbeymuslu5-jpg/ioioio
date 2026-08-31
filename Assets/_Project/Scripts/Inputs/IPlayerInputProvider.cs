namespace TrenchSurvivor.Inputs
{
    /// <summary>
    /// Girdi kaynagini hareket kodundan ayiran sozlesme.
    /// Dokunmatik, klavye veya yapay zeka (bot) kontrolu ayni arayuzu uygular.
    /// </summary>
    public interface IPlayerInputProvider
    {
        /// <summary>Yatay eksen girdisi (-1 sol, +1 sag).</summary>
        float Horizontal { get; }

        /// <summary>Kosma istegi aktif mi (joystick tam itildiginde veya kosu tusunda).</summary>
        bool RunHeld { get; }

        /// <summary>Surunme (siper altinda ilerleme) istegi aktif mi.</summary>
        bool CrawlHeld { get; }

        /// <summary>
        /// Serit degistirme istegini tuketir. -1 one dogru (kameraya yakin),
        /// +1 arkaya dogru (kameradan uzak) serit anlamina gelir.
        /// Istek yoksa false doner; true donduysa istek sifirlanir.
        /// </summary>
        bool TryConsumeLaneChange(out int direction);
    }
}
