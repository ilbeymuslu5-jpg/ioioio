namespace TrenchSurvivor.Player
{
    /// <summary>Karakterin anlik durusu. Animator ve hasar hesaplari bu degeri okur.</summary>
    public enum MovementStance
    {
        /// <summary>Ayakta yurume.</summary>
        Walking = 0,

        /// <summary>Kosma; enerjiyi daha hizli tuketir.</summary>
        Running = 1,

        /// <summary>Surunme; yavas ama dikenli tel ve siper alti gecislerinde zorunlu.</summary>
        Crawling = 2
    }
}
