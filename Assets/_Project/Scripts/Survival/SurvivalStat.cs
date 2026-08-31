using System;
using UnityEngine;

namespace TrenchSurvivor.Survival
{
    /// <summary>
    /// Can, vucut isisi ve gaz filtresi gibi tum sayaclar icin ortak taban.
    /// Sinirlama ve olay yayini tek yerde toplanir ki her istatistik icin kod tekrarlanmasin.
    /// </summary>
    [Serializable]
    public class SurvivalStat
    {
        [Tooltip("Bu istatistigin ust siniri.")]
        [Min(0.01f)]
        [SerializeField] private float maxValue = 100f;

        [Tooltip("Oyun basladiginda kullanilacak deger.")]
        [Min(0f)]
        [SerializeField] private float startValue = 100f;

        private float _current;
        private bool _initialized;

        /// <summary>Deger degistiginde tetiklenir (guncel deger, ust sinir).</summary>
        public event Action<float, float> Changed;

        /// <summary>Deger sifira dustugunde bir kez tetiklenir.</summary>
        public event Action Depleted;

        public float Current => _current;
        public float MaxValue => maxValue;
        public float Normalized => maxValue > 0f ? _current / maxValue : 0f;
        public bool IsEmpty => _current <= 0f;
        public bool IsFull => _current >= maxValue;

        /// <summary>Baslangic degerini uygular. Awake icinde cagrilmalidir.</summary>
        public void Initialize()
        {
            _current = Mathf.Clamp(startValue, 0f, maxValue);
            _initialized = true;
            Changed?.Invoke(_current, maxValue);
        }

        /// <summary>Degeri artirir (sargi bezi, konserve, yeni filtre).</summary>
        public void Add(float amount)
        {
            if (amount <= 0f)
            {
                return;
            }

            SetValue(_current + amount);
        }

        /// <summary>Degeri azaltir. Sifira dustuyse true doner.</summary>
        public bool Consume(float amount)
        {
            if (amount <= 0f)
            {
                return IsEmpty;
            }

            bool wasEmpty = IsEmpty;
            SetValue(_current - amount);

            if (!wasEmpty && IsEmpty)
            {
                Depleted?.Invoke();
            }

            return IsEmpty;
        }

        /// <summary>Degeri dogrudan atar (yukleme ekrani, hile menusu, kesme sahnesi).</summary>
        public void SetValue(float value)
        {
            if (!_initialized)
            {
                Initialize();
            }

            float clamped = Mathf.Clamp(value, 0f, maxValue);
            if (Mathf.Approximately(clamped, _current))
            {
                return;
            }

            _current = clamped;
            Changed?.Invoke(_current, maxValue);
        }

        /// <summary>Ust siniri degistirir (yetenek yukseltmesi, buyuk filtre kutusu).</summary>
        public void SetMax(float value, bool refill = false)
        {
            maxValue = Mathf.Max(0.01f, value);
            SetValue(refill ? maxValue : _current);
            Changed?.Invoke(_current, maxValue);
        }
    }
}
