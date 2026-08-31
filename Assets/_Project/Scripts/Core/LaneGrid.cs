using UnityEngine;

namespace TrenchSurvivor.Core
{
    /// <summary>
    /// Derinlik (Z) eksenindeki siper hatlarini tanimlayan ortak veri varligi.
    /// Hem oyuncu hem dusman yapay zekasi ayni serit tablosunu kullanir ki
    /// hizalama sorunlari yasanmasin.
    /// Menu: Create > Trench Survivor > Lane Grid
    /// </summary>
    [CreateAssetMenu(fileName = "LaneGrid", menuName = "Trench Survivor/Lane Grid", order = 0)]
    public class LaneGrid : ScriptableObject
    {
        [Tooltip("Toplam serit sayisi. Varsayilan tasarim: on plan, orta plan, arka plan.")]
        [Min(1)]
        [SerializeField] private int laneCount = 3;

        [Tooltip("0 numarali seridin dunya uzerindeki Z koordinati (kameraya en yakin hat).")]
        [SerializeField] private float originZ = -2f;

        [Tooltip("Iki serit arasindaki Z mesafesi (metre).")]
        [Min(0.1f)]
        [SerializeField] private float spacing = 2f;

        [Tooltip("Oyun basladiginda oyuncunun bulunacagi serit (orta plan onerilir).")]
        [SerializeField] private int defaultLaneIndex = 1;

        public int LaneCount => laneCount;
        public int DefaultLaneIndex => Mathf.Clamp(defaultLaneIndex, 0, laneCount - 1);
        public int LastLaneIndex => laneCount - 1;

        /// <summary>Verilen seridin dunya uzerindeki Z koordinatini dondurur.</summary>
        public float GetLaneDepth(int laneIndex)
        {
            return originZ + ClampLane(laneIndex) * spacing;
        }

        /// <summary>Serit indeksini gecerli araliga sikistirir.</summary>
        public int ClampLane(int laneIndex)
        {
            return Mathf.Clamp(laneIndex, 0, LastLaneIndex);
        }

        /// <summary>Verilen indeks tabloda var mi.</summary>
        public bool IsValidLane(int laneIndex)
        {
            return laneIndex >= 0 && laneIndex < laneCount;
        }

        /// <summary>Dunya uzerindeki bir Z degerine en yakin seridi bulur (spawn hizalama icin).</summary>
        public int GetNearestLane(float worldZ)
        {
            int nearest = 0;
            float bestDistance = float.MaxValue;

            for (int i = 0; i < laneCount; i++)
            {
                float distance = Mathf.Abs(GetLaneDepth(i) - worldZ);
                if (distance < bestDistance)
                {
                    bestDistance = distance;
                    nearest = i;
                }
            }

            return nearest;
        }
    }
}
