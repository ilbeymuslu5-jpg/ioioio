-- DöngüPazar: kategori seed'i (CLAUDE.md Bölüm 3)
-- Tekrar çalıştırılabilir: slug çakışırsa ad/ikon/sıra güncellenir.
-- Tehlikeli atık kategorisi bilerek YOKTUR (MVP'de yasak).

with roots (slug, name_tr, name_en, type, icon, sort_order) as (
  values
    ('palet',            'Palet',                      'Pallets',                    'pallet', 'layers',       10),
    ('ahsap',            'Ahşap',                      'Wood',                       'waste',  'tree-pine',    20),
    ('plastik',          'Plastik',                    'Plastics',                   'waste',  'milk',         30),
    ('kagit-karton',     'Kâğıt / Karton',             'Paper / Cardboard',          'waste',  'package',      40),
    ('tekstil',          'Tekstil',                    'Textiles',                   'waste',  'shirt',        50),
    ('metal',            'Metal',                      'Metals',                     'waste',  'wrench',       60),
    ('cam',              'Cam',                        'Glass',                      'waste',  'glass-water',  70),
    ('organik',          'Organik / Gıda yan ürünü',   'Organic / Food by-products', 'waste',  'leaf',         80),
    ('diger',            'Diğer',                      'Other',                      'waste',  'shapes',       90)
)
insert into public.categories (slug, name_tr, name_en, type, icon, sort_order)
select slug, name_tr, name_en, type::public.category_type, icon, sort_order
from roots
on conflict (slug) do update
set name_tr = excluded.name_tr,
    name_en = excluded.name_en,
    type = excluded.type,
    icon = excluded.icon,
    sort_order = excluded.sort_order;

with children (parent_slug, slug, name_tr, name_en, sort_order) as (
  values
    -- Palet
    ('palet', 'euro-palet',            'Euro palet (EPAL, 800×1200)',      'Euro pallet (EPAL, 800×1200)',  10),
    ('palet', 'standart-palet',        'Standart palet (1000×1200)',       'Standard pallet (1000×1200)',   20),
    ('palet', 'ozel-olcu-palet',       'Özel ölçü palet',                  'Custom size pallet',            30),
    ('palet', 'plastik-palet',         'Plastik palet',                    'Plastic pallet',                40),
    ('palet', 'metal-palet',           'Metal palet',                      'Metal pallet',                  50),
    ('palet', 'kirik-palet',           'Kırık / tamir edilecek palet',     'Broken / repairable pallet',    60),
    -- Ahşap
    ('ahsap', 'talas',                 'Talaş',                            'Sawdust',                       10),
    ('ahsap', 'yonga',                 'Yonga',                            'Wood chips',                    20),
    ('ahsap', 'kesim-artigi',          'Kesim artığı',                     'Offcuts',                       30),
    ('ahsap', 'kirik-palet-ahsabi',    'Kırık palet ahşabı',               'Broken pallet wood',            40),
    -- Plastik
    ('plastik', 'pe',                  'PE (polietilen)',                  'PE (polyethylene)',             10),
    ('plastik', 'pp',                  'PP (polipropilen)',                'PP (polypropylene)',            20),
    ('plastik', 'pet',                 'PET',                              'PET',                           30),
    ('plastik', 'strec-film',          'Streç film',                       'Stretch film',                  40),
    ('plastik', 'plastik-kirma',       'Kırma',                            'Regrind',                       50),
    ('plastik', 'granul',              'Granül',                           'Granules',                      60),
    -- Kâğıt / karton
    ('kagit-karton', 'oluklu-mukavva', 'Oluklu mukavva',                   'Corrugated cardboard',          10),
    ('kagit-karton', 'kagit-artigi',   'Kâğıt artığı',                     'Paper scrap',                   20),
    -- Tekstil
    ('tekstil', 'kumas-kirpintisi',    'Kumaş kırpıntısı',                 'Fabric clippings',              10),
    ('tekstil', 'iplik-artigi',        'İplik artığı',                     'Yarn waste',                    20),
    -- Metal
    ('metal', 'hurda-demir',           'Hurda demir',                      'Scrap iron',                    10),
    ('metal', 'aluminyum',             'Alüminyum',                        'Aluminium',                     20),
    ('metal', 'bakir',                 'Bakır',                            'Copper',                        30),
    ('metal', 'metal-talasi',          'Metal talaşı',                     'Metal swarf',                   40),
    -- Organik / gıda yan ürünü
    ('organik', 'pirinc-kabugu',       'Pirinç kabuğu',                    'Rice husk',                     10),
    ('organik', 'zeytin-karasuyu',     'Zeytin karasuyu',                  'Olive mill wastewater',         20),
    ('organik', 'pirina',              'Pirina (zeytin posası)',           'Olive pomace',                  30),
    ('organik', 'meyve-posasi',        'Meyve posası',                     'Fruit pomace',                  40),
    ('organik', 'diger-organik',       'Diğer organik yan ürün',           'Other organic by-product',      90)
)
insert into public.categories (parent_id, slug, name_tr, name_en, type, icon, sort_order)
select p.id, c.slug, c.name_tr, c.name_en, p.type, p.icon, c.sort_order
from children c
join public.categories p on p.slug = c.parent_slug
on conflict (slug) do update
set parent_id = excluded.parent_id,
    name_tr = excluded.name_tr,
    name_en = excluded.name_en,
    type = excluded.type,
    icon = excluded.icon,
    sort_order = excluded.sort_order;
