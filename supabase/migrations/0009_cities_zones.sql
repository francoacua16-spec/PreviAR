-- ─────────────────────────────────────────────────────────────────
-- 0009 — El catálogo de ciudades y zonas se muda a la base
--
-- Hasta acá la app sólo existía en tres ciudades, y esas tres estaban
-- clavadas en cinco lugares distintos: un `check` en `parties.city`, cuatro
-- guardas `BAD_CITY` con la lista literal repetida, seis
-- `case when p_city = 'la_plata' then 50 else 40 end`, y el array `CITIES`
-- de `lib/zones.ts`. Agregar una ciudad era tocar todo eso sin que nada
-- avisara si se olvidaba uno.
--
-- Acá:
--   1. `cities` y `zones` pasan a ser el catálogo, con FK desde `parties`.
--   2. El límite legal deja de estar hardcodeado: sale de `cities.legal_limit`.
--   3. `zones_in_bbox` sirve los pines de cualquier recuadro del mapa, sin
--      pedir una ciudad. Es lo que habilita "buscás donde quieras".
--
-- El seed lo genera `npm run gen:zones` desde `lib/zones.ts`, que sigue
-- siendo el archivo que se autora. No se edita el bloque generado a mano.
--
-- Las tres ciudades viejas se siembran con sus zonas exactamente como están
-- hoy (incluida la corrección de Bariloche fuera del lago): esta migración
-- no cambia nada de lo que ya ve la gente.
-- ─────────────────────────────────────────────────────────────────

-- ───────────────────────── 1. Catálogo ──────────────────────────

create table if not exists public.cities (
  key         text primary key,
  label       text not null,
  short       text not null,
  province    text not null,
  lat         double precision not null,
  lng         double precision not null,
  -- Radio en el que el mapa se considera "dentro" de esta ciudad. Antes era
  -- una constante global de 30 km: servía con tres ciudades lejanas, pero en
  -- el Gran Buenos Aires hay partidos a 8 km uno del otro.
  radius_m    int not null default 30000 check (radius_m > 0),
  legal_limit int not null default 40 check (legal_limit between 1 and 500),
  active      boolean not null default true,
  sort        int not null default 0
);

create table if not exists public.zones (
  city_key text not null references public.cities(key) on update cascade on delete cascade,
  -- Las claves de zona NO son únicas a nivel país: `centro` existe en casi
  -- todas las ciudades. La unicidad es compuesta con la ciudad.
  key      text not null,
  label    text not null,
  lat      double precision not null,
  lng      double precision not null,
  primary key (city_key, key)
);

create index if not exists zones_city_idx on public.zones (city_key);

-- Catálogo público para cualquiera con sesión: son nombres de barrio, no
-- hay nada que proteger. La escritura no se otorga a nadie: se cambia por
-- migración, generada desde `lib/zones.ts`.
alter table public.cities enable row level security;
alter table public.zones  enable row level security;

revoke all on public.cities from anon, authenticated;
revoke all on public.zones  from anon, authenticated;
grant select on public.cities to authenticated;
grant select on public.zones  to authenticated;

drop policy if exists cities_select on public.cities;
create policy cities_select on public.cities for select to authenticated using (true);

drop policy if exists zones_select on public.zones;
create policy zones_select on public.zones for select to authenticated using (true);

-- ─────────────────────────── 2. Seed ────────────────────────────

-- El seed es un upsert: re-aplicar la migración no borra nada ni rompe la FK
-- desde `parties`.

-- >>> BEGIN SEED GENERADO — no editar a mano (npm run gen:zones)
-- 59 ciudades, 374 zonas.

insert into public.cities (key, label, short, province, lat, lng, radius_m, legal_limit, sort) values
  ('la_plata', 'La Plata', 'LP', 'Buenos Aires', -34.9215, -57.9545, 30000, 50, 0),
  ('caba', 'CABA', 'BA', 'Ciudad de Buenos Aires', -34.6037, -58.3816, 25000, 40, 1),
  ('bariloche', 'Bariloche', 'BRC', 'Río Negro', -41.1335, -71.3103, 30000, 40, 2),
  ('vicente_lopez', 'Vicente López', 'VL', 'Buenos Aires', -34.5265, -58.4784, 12000, 40, 3),
  ('san_isidro', 'San Isidro', 'SI', 'Buenos Aires', -34.4708, -58.5128, 14000, 40, 4),
  ('tigre', 'Tigre', 'TIG', 'Buenos Aires', -34.4264, -58.5796, 20000, 40, 5),
  ('pilar', 'Pilar', 'PIL', 'Buenos Aires', -34.4585, -58.9142, 20000, 40, 6),
  ('san_miguel', 'San Miguel', 'SM', 'Buenos Aires', -34.5433, -58.7128, 14000, 40, 7),
  ('moron', 'Morón', 'MOR', 'Buenos Aires', -34.6534, -58.6198, 13000, 40, 8),
  ('avellaneda', 'Avellaneda', 'AVE', 'Buenos Aires', -34.6633, -58.3653, 12000, 40, 9),
  ('lanus', 'Lanús', 'LAN', 'Buenos Aires', -34.7069, -58.3925, 10000, 40, 10),
  ('lomas_de_zamora', 'Lomas de Zamora', 'LZ', 'Buenos Aires', -34.7601, -58.4006, 14000, 40, 11),
  ('quilmes', 'Quilmes', 'QUI', 'Buenos Aires', -34.7203, -58.254, 14000, 40, 12),
  ('berazategui', 'Berazategui', 'BZG', 'Buenos Aires', -34.7644, -58.2117, 14000, 40, 13),
  ('la_matanza', 'La Matanza', 'LM', 'Buenos Aires', -34.6667, -58.5667, 22000, 40, 14),
  ('mar_del_plata', 'Mar del Plata', 'MDQ', 'Buenos Aires', -38.0055, -57.5426, 25000, 40, 15),
  ('rosario', 'Rosario', 'ROS', 'Santa Fe', -32.9442, -60.6505, 20000, 40, 16),
  ('cordoba', 'Córdoba', 'CBA', 'Córdoba', -31.4201, -64.1888, 22000, 40, 17),
  ('mendoza', 'Mendoza', 'MDZ', 'Mendoza', -32.8895, -68.8458, 25000, 40, 18),
  ('tucuman', 'San Miguel de Tucumán', 'TUC', 'Tucumán', -26.8083, -65.2176, 18000, 40, 19),
  ('salta', 'Salta', 'SLA', 'Salta', -24.7859, -65.4117, 18000, 40, 20),
  ('santa_fe', 'Santa Fe', 'SFE', 'Santa Fe', -31.6333, -60.7, 16000, 40, 21),
  ('parana', 'Paraná', 'PAR', 'Entre Ríos', -31.7333, -60.5333, 14000, 40, 22),
  ('corrientes', 'Corrientes', 'CTS', 'Corrientes', -27.4692, -58.8306, 14000, 40, 23),
  ('resistencia', 'Resistencia', 'RES', 'Chaco', -27.4514, -58.9867, 14000, 40, 24),
  ('posadas', 'Posadas', 'PSS', 'Misiones', -27.3671, -55.8961, 14000, 40, 25),
  ('neuquen', 'Neuquén', 'NQN', 'Neuquén', -38.9516, -68.0591, 16000, 40, 26),
  ('bahia_blanca', 'Bahía Blanca', 'BB', 'Buenos Aires', -38.7183, -62.2661, 16000, 40, 27),
  ('tandil', 'Tandil', 'TDL', 'Buenos Aires', -37.3217, -59.1332, 14000, 40, 28),
  ('pinamar', 'Pinamar', 'PIN', 'Buenos Aires', -37.1069, -56.8592, 15000, 40, 29),
  ('villa_gesell', 'Villa Gesell', 'VG', 'Buenos Aires', -37.2639, -56.9731, 15000, 40, 30),
  ('san_bernardo', 'San Bernardo / Mar de Ajó', 'SB', 'Buenos Aires', -36.6939, -56.6803, 15000, 40, 31),
  ('miramar', 'Miramar', 'MIR', 'Buenos Aires', -38.2667, -57.8394, 12000, 40, 32),
  ('necochea', 'Necochea', 'NEC', 'Buenos Aires', -38.5545, -58.7396, 13000, 40, 33),
  ('villa_carlos_paz', 'Villa Carlos Paz', 'VCP', 'Córdoba', -31.4241, -64.4978, 15000, 40, 34),
  ('rio_cuarto', 'Río Cuarto', 'RC', 'Córdoba', -33.1307, -64.3499, 14000, 40, 35),
  ('san_juan', 'San Juan', 'SJ', 'San Juan', -31.5375, -68.5364, 16000, 40, 36),
  ('san_luis', 'San Luis', 'SL', 'San Luis', -33.3017, -66.3378, 16000, 40, 37),
  ('san_rafael', 'San Rafael', 'SR', 'Mendoza', -34.6177, -68.3301, 18000, 40, 38),
  ('jujuy', 'San Salvador de Jujuy', 'JUJ', 'Jujuy', -24.1858, -65.2995, 16000, 40, 39),
  ('catamarca', 'San Fernando del Valle de Catamarca', 'CAT', 'Catamarca', -28.4696, -65.7852, 14000, 40, 40),
  ('la_rioja', 'La Rioja', 'LR', 'La Rioja', -29.4131, -66.8558, 14000, 40, 41),
  ('santiago_del_estero', 'Santiago del Estero', 'SDE', 'Santiago del Estero', -27.7951, -64.2615, 14000, 40, 42),
  ('formosa', 'Formosa', 'FSA', 'Formosa', -26.1849, -58.1731, 12000, 40, 43),
  ('rio_gallegos', 'Río Gallegos', 'RGL', 'Santa Cruz', -51.6226, -69.2181, 12000, 40, 44),
  ('comodoro_rivadavia', 'Comodoro Rivadavia', 'CRD', 'Chubut', -45.8641, -67.4966, 18000, 40, 45),
  ('puerto_madryn', 'Puerto Madryn', 'PMY', 'Chubut', -42.7692, -65.0385, 15000, 40, 46),
  ('trelew', 'Trelew', 'REL', 'Chubut', -43.2489, -65.3051, 12000, 40, 47),
  ('ushuaia', 'Ushuaia', 'USH', 'Tierra del Fuego', -54.8019, -68.303, 15000, 40, 48),
  ('el_bolson', 'El Bolsón', 'EBO', 'Río Negro', -41.9686, -71.534, 16000, 40, 49),
  ('san_martin_de_los_andes', 'San Martín de los Andes', 'SMA', 'Neuquén', -40.1579, -71.3529, 16000, 40, 50),
  ('villa_la_angostura', 'Villa La Angostura', 'VLA', 'Neuquén', -40.757, -71.6486, 15000, 40, 51),
  ('esquel', 'Esquel', 'EQS', 'Chubut', -42.9092, -71.3151, 14000, 40, 52),
  ('viedma', 'Viedma', 'VDM', 'Río Negro', -40.8135, -62.9967, 14000, 40, 53),
  ('concordia', 'Concordia', 'CDA', 'Entre Ríos', -31.3929, -58.0209, 14000, 40, 54),
  ('gualeguaychu', 'Gualeguaychú', 'GCH', 'Entre Ríos', -33.0092, -58.5172, 13000, 40, 55),
  ('rafaela', 'Rafaela', 'RAF', 'Santa Fe', -31.2503, -61.4867, 12000, 40, 56),
  ('san_nicolas', 'San Nicolás de los Arroyos', 'SNS', 'Buenos Aires', -33.3358, -60.2119, 13000, 40, 57),
  ('junin', 'Junín', 'JUN', 'Buenos Aires', -34.5836, -60.9464, 12000, 40, 58)
on conflict (key) do update set
  label = excluded.label, short = excluded.short, province = excluded.province,
  lat = excluded.lat, lng = excluded.lng, radius_m = excluded.radius_m,
  legal_limit = excluded.legal_limit, sort = excluded.sort;

insert into public.zones (city_key, key, label, lat, lng) values
  ('la_plata', 'tolosa', 'Tolosa', -34.9078, -57.975),
  ('la_plata', 'city-bell', 'City Bell', -34.8861, -58.0522),
  ('la_plata', 'la-loma', 'La Loma', -34.9372, -57.9667),
  ('la_plata', 'barrio-norte', 'Barrio Norte', -34.9, -57.9528),
  ('la_plata', 'centro', 'Centro', -34.9215, -57.9545),
  ('la_plata', 'gonnet', 'Gonnet', -34.8778, -58.01),
  ('la_plata', 'los-hornos', 'Los Hornos', -34.9722, -57.9733),
  ('la_plata', 'ringuelet', 'Ringuelet', -34.8917, -57.9744),
  ('la_plata', 'villa-elisa', 'Villa Elisa', -34.8625, -58.0819),
  ('la_plata', 'el-mondongo', 'El Mondongo', -34.9308, -57.9264),
  ('la_plata', 'meridiano-v', 'Meridiano V', -34.9153, -57.9639),
  ('la_plata', 'abasto', 'Abasto', -35.0167, -57.9667),
  ('la_plata', 'san-carlos', 'San Carlos', -34.9481, -58.0106),
  ('la_plata', 'altos-de-san-lorenzo', 'Altos de San Lorenzo', -34.9367, -57.9439),
  ('la_plata', 'olmos', 'Olmos', -34.9506, -58.0119),
  ('la_plata', 'arturo-segui', 'Arturo Seguí', -34.8961, -58.0308),
  ('la_plata', 'villa-castells', 'Villa Castells', -34.8797, -58.0389),
  ('la_plata', 'hernandez', 'Hernández', -34.8664, -58.0722),
  ('caba', 'palermo', 'Palermo', -34.5883, -58.4306),
  ('caba', 'belgrano', 'Belgrano', -34.5625, -58.4583),
  ('caba', 'nunez', 'Nuñez', -34.5472, -58.4667),
  ('caba', 'villa-crespo', 'Villa Crespo', -34.6033, -58.4394),
  ('caba', 'caballito', 'Caballito', -34.6125, -58.4431),
  ('caba', 'san-telmo', 'San Telmo', -34.6211, -58.3714),
  ('caba', 'recoleta', 'Recoleta', -34.5889, -58.3911),
  ('caba', 'almagro', 'Almagro', -34.6089, -58.4206),
  ('caba', 'boedo', 'Boedo', -34.6294, -58.4183),
  ('caba', 'flores', 'Flores', -34.6283, -58.4633),
  ('caba', 'floresta', 'Floresta', -34.6294, -58.4839),
  ('caba', 'villa-urquiza', 'Villa Urquiza', -34.5761, -58.4864),
  ('caba', 'colegiales', 'Colegiales', -34.5761, -58.4489),
  ('caba', 'chacarita', 'Chacarita', -34.5872, -58.4544),
  ('caba', 'barracas', 'Barracas', -34.6417, -58.3833),
  ('caba', 'la-boca', 'La Boca', -34.6345, -58.3631),
  ('caba', 'puerto-madero', 'Puerto Madero', -34.6083, -58.3625),
  ('caba', 'constitucion', 'Constitución', -34.6264, -58.3811),
  ('caba', 'retiro', 'Retiro', -34.5925, -58.3747),
  ('caba', 'once', 'Once / Balvanera', -34.6089, -58.4056),
  ('caba', 'villa-del-parque', 'Villa del Parque', -34.6014, -58.4886),
  ('caba', 'saavedra', 'Saavedra', -34.5589, -58.4842),
  ('bariloche', 'centro', 'Centro', -41.1335, -71.3103),
  ('bariloche', 'melipal', 'Melipal', -41.1275, -71.3672),
  ('bariloche', 'las-victorias', 'Las Victorias', -41.1467, -71.3472),
  ('bariloche', 'este', 'Este', -41.135, -71.25),
  ('bariloche', 'km8', 'Km 8', -41.1233, -71.4017),
  ('bariloche', 'circuito-chico', 'Circuito Chico', -41.0872, -71.5461),
  ('bariloche', 'playa-bonita', 'Playa Bonita', -41.1213, -71.4075),
  ('bariloche', 'colonia-suiza', 'Colonia Suiza', -41.1053, -71.5453),
  ('bariloche', 'villa-los-coihues', 'Villa Los Coihues', -41.15, -71.4),
  ('bariloche', 'lago-gutierrez', 'Lago Gutiérrez', -41.1836, -71.3839),
  ('bariloche', 'cerro-otto', 'Cerro Otto', -41.1394, -71.3661),
  ('bariloche', 'cerro-catedral', 'Cerro Catedral', -41.1656, -71.4425),
  ('bariloche', 'pinar-de-arelauquen', 'Pinar de Arelauquen', -41.175, -71.385),
  ('bariloche', 'bustillo-km12', 'Bustillo Km 12', -41.1178, -71.4436),
  ('bariloche', 'bustillo-km18', 'Bustillo Km 18', -41.105, -71.5017),
  ('bariloche', 'virgen-de-las-nieves', 'Virgen de las Nieves', -41.1444, -71.3),
  ('bariloche', 'barrio-belgrano', 'Belgrano', -41.1417, -71.3117),
  ('bariloche', 'nahuel-huapi', 'Nahuel Huapi', -41.15, -71.35),
  ('vicente_lopez', 'olivos', 'Olivos', -34.5083, -58.4894),
  ('vicente_lopez', 'florida', 'Florida', -34.5333, -58.4917),
  ('vicente_lopez', 'munro', 'Munro', -34.5261, -58.5222),
  ('vicente_lopez', 'la-lucila', 'La Lucila', -34.4986, -58.4844),
  ('vicente_lopez', 'vicente-lopez-centro', 'Centro', -34.5265, -58.4784),
  ('vicente_lopez', 'villa-martelli', 'Villa Martelli', -34.5583, -58.5),
  ('vicente_lopez', 'carapachay', 'Carapachay', -34.5306, -58.5361),
  ('san_isidro', 'san-isidro-centro', 'Centro', -34.4708, -58.5128),
  ('san_isidro', 'martinez', 'Martínez', -34.4906, -58.5028),
  ('san_isidro', 'acassuso', 'Acassuso', -34.4772, -58.5006),
  ('san_isidro', 'beccar', 'Beccar', -34.4611, -58.5308),
  ('san_isidro', 'boulogne', 'Boulogne', -34.5028, -58.5678),
  ('san_isidro', 'villa-adelina', 'Villa Adelina', -34.5194, -58.5497),
  ('san_isidro', 'la-horqueta', 'La Horqueta', -34.4736, -58.5556),
  ('tigre', 'tigre-centro', 'Centro', -34.4264, -58.5796),
  ('tigre', 'nordelta', 'Nordelta', -34.4033, -58.6417),
  ('tigre', 'rincon-de-milberg', 'Rincón de Milberg', -34.4147, -58.6042),
  ('tigre', 'don-torcuato', 'Don Torcuato', -34.4903, -58.6208),
  ('tigre', 'general-pacheco', 'General Pacheco', -34.4581, -58.6392),
  ('tigre', 'el-delta', 'El Delta', -34.3833, -58.5333),
  ('tigre', 'benavidez', 'Benavídez', -34.4189, -58.6928),
  ('pilar', 'pilar-centro', 'Centro', -34.4585, -58.9142),
  ('pilar', 'del-viso', 'Del Viso', -34.4269, -58.8),
  ('pilar', 'manuel-alberti', 'Manuel Alberti', -34.4472, -58.8542),
  ('pilar', 'villa-rosa', 'Villa Rosa', -34.3875, -58.9333),
  ('pilar', 'pilar-del-este', 'Pilar del Este', -34.4333, -58.85),
  ('pilar', 'la-lonja', 'La Lonja', -34.4833, -58.85),
  ('san_miguel', 'san-miguel-centro', 'Centro', -34.5433, -58.7128),
  ('san_miguel', 'bella-vista', 'Bella Vista', -34.5722, -58.6817),
  ('san_miguel', 'muniz', 'Muñiz', -34.5583, -58.7028),
  ('san_miguel', 'trujui', 'Trujui', -34.5667, -58.7583),
  ('san_miguel', 'jose-c-paz', 'José C. Paz', -34.5136, -58.7642),
  ('moron', 'moron-centro', 'Centro', -34.6534, -58.6198),
  ('moron', 'castelar', 'Castelar', -34.6533, -58.6497),
  ('moron', 'haedo', 'Haedo', -34.6431, -58.5931),
  ('moron', 'el-palomar', 'El Palomar', -34.6122, -58.5906),
  ('moron', 'villa-sarmiento', 'Villa Sarmiento', -34.6383, -58.5794),
  ('moron', 'ituzaingo', 'Ituzaingó', -34.6583, -58.6683),
  ('avellaneda', 'avellaneda-centro', 'Centro', -34.6633, -58.3653),
  ('avellaneda', 'sarandi', 'Sarandí', -34.6864, -58.3428),
  ('avellaneda', 'wilde', 'Wilde', -34.7, -58.3167),
  ('avellaneda', 'dock-sud', 'Dock Sud', -34.65, -58.3417),
  ('avellaneda', 'villa-dominico', 'Villa Domínico', -34.6944, -58.3306),
  ('avellaneda', 'gerli', 'Gerli', -34.6825, -58.3733),
  ('lanus', 'lanus-oeste', 'Lanús Oeste', -34.7069, -58.3925),
  ('lanus', 'lanus-este', 'Lanús Este', -34.7033, -58.3667),
  ('lanus', 'remedios-de-escalada', 'Remedios de Escalada', -34.7264, -58.3936),
  ('lanus', 'valentin-alsina', 'Valentín Alsina', -34.6708, -58.4106),
  ('lanus', 'monte-chingolo', 'Monte Chingolo', -34.7278, -58.3556),
  ('lomas_de_zamora', 'lomas-centro', 'Centro', -34.7601, -58.4006),
  ('lomas_de_zamora', 'banfield', 'Banfield', -34.7433, -58.3933),
  ('lomas_de_zamora', 'temperley', 'Temperley', -34.7717, -58.3961),
  ('lomas_de_zamora', 'turdera', 'Turdera', -34.7889, -58.4025),
  ('lomas_de_zamora', 'llavallol', 'Llavallol', -34.7972, -58.4194),
  ('lomas_de_zamora', 'villa-fiorito', 'Villa Fiorito', -34.7069, -58.4406),
  ('quilmes', 'quilmes-centro', 'Centro', -34.7203, -58.254),
  ('quilmes', 'bernal', 'Bernal', -34.7078, -58.2811),
  ('quilmes', 'don-bosco', 'Don Bosco', -34.7008, -58.2942),
  ('quilmes', 'ezpeleta', 'Ezpeleta', -34.7522, -58.2358),
  ('quilmes', 'quilmes-oeste', 'Quilmes Oeste', -34.7283, -58.2842),
  ('quilmes', 'la-ribera', 'La Ribera', -34.7083, -58.2278),
  ('berazategui', 'berazategui-centro', 'Centro', -34.7644, -58.2117),
  ('berazategui', 'hudson', 'Hudson', -34.7981, -58.1444),
  ('berazategui', 'platanos', 'Plátanos', -34.7842, -58.1806),
  ('berazategui', 'ranelagh', 'Ranelagh', -34.7803, -58.1719),
  ('berazategui', 'villa-espana', 'Villa España', -34.7481, -58.2183),
  ('la_matanza', 'ramos-mejia', 'Ramos Mejía', -34.6444, -58.5658),
  ('la_matanza', 'san-justo', 'San Justo', -34.6767, -58.5606),
  ('la_matanza', 'villa-luzuriaga', 'Villa Luzuriaga', -34.6675, -58.5883),
  ('la_matanza', 'isidro-casanova', 'Isidro Casanova', -34.7025, -58.5872),
  ('la_matanza', 'gregorio-de-laferrere', 'Gregorio de Laferrère', -34.7439, -58.5883),
  ('la_matanza', 'gonzalez-catan', 'González Catán', -34.7717, -58.6467),
  ('la_matanza', 'lomas-del-mirador', 'Lomas del Mirador', -34.6644, -58.5222),
  ('mar_del_plata', 'mdq-centro', 'Centro', -38.0023, -57.5575),
  ('mar_del_plata', 'playa-grande', 'Playa Grande', -38.0264, -57.5311),
  ('mar_del_plata', 'la-perla', 'La Perla', -37.9903, -57.5453),
  ('mar_del_plata', 'guemes', 'Güemes', -38.0083, -57.5461),
  ('mar_del_plata', 'constitucion', 'Constitución', -37.9536, -57.5464),
  ('mar_del_plata', 'los-troncos', 'Los Troncos', -38.0181, -57.5386),
  ('mar_del_plata', 'punta-mogotes', 'Punta Mogotes', -38.0708, -57.5389),
  ('mar_del_plata', 'chauvin', 'Chauvín', -38.0139, -57.5433),
  ('mar_del_plata', 'puerto', 'Puerto', -38.0361, -57.5325),
  ('mar_del_plata', 'varese', 'Varese', -38.0139, -57.5333),
  ('rosario', 'rosario-centro', 'Centro', -32.9468, -60.6393),
  ('rosario', 'pichincha', 'Pichincha', -32.9333, -60.6472),
  ('rosario', 'fisherton', 'Fisherton', -32.9222, -60.7333),
  ('rosario', 'echesortu', 'Echesortu', -32.9494, -60.6725),
  ('rosario', 'arroyito', 'Arroyito', -32.9106, -60.6708),
  ('rosario', 'la-florida', 'La Florida', -32.8853, -60.6944),
  ('rosario', 'abasto', 'Abasto', -32.9622, -60.6647),
  ('rosario', 'puerto-norte', 'Puerto Norte', -32.9264, -60.6383),
  ('rosario', 'republica-de-la-sexta', 'República de la Sexta', -32.9583, -60.6392),
  ('cordoba', 'cordoba-centro', 'Centro', -31.4167, -64.1833),
  ('cordoba', 'nueva-cordoba', 'Nueva Córdoba', -31.4306, -64.1861),
  ('cordoba', 'guemes', 'Güemes', -31.4283, -64.1953),
  ('cordoba', 'cerro-de-las-rosas', 'Cerro de las Rosas', -31.3811, -64.2308),
  ('cordoba', 'alta-cordoba', 'Alta Córdoba', -31.3944, -64.1789),
  ('cordoba', 'general-paz', 'General Paz', -31.4083, -64.1656),
  ('cordoba', 'villa-belgrano', 'Villa Belgrano', -31.3833, -64.2583),
  ('cordoba', 'alberdi', 'Alberdi', -31.4139, -64.2022),
  ('cordoba', 'urca', 'Urca', -31.3922, -64.2244),
  ('mendoza', 'mendoza-centro', 'Centro', -32.8895, -68.8458),
  ('mendoza', 'quinta-seccion', 'Quinta Sección', -32.8956, -68.8567),
  ('mendoza', 'godoy-cruz', 'Godoy Cruz', -32.925, -68.8333),
  ('mendoza', 'chacras-de-coria', 'Chacras de Coria', -32.9847, -68.8778),
  ('mendoza', 'guaymallen', 'Guaymallén', -32.8917, -68.7986),
  ('mendoza', 'las-heras', 'Las Heras', -32.8497, -68.8317),
  ('mendoza', 'maipu', 'Maipú', -32.9833, -68.7833),
  ('mendoza', 'lujan-de-cuyo', 'Luján de Cuyo', -33.0361, -68.8792),
  ('tucuman', 'tuc-centro', 'Centro', -26.8241, -65.2226),
  ('tucuman', 'barrio-norte', 'Barrio Norte', -26.8083, -65.2094),
  ('tucuman', 'yerba-buena', 'Yerba Buena', -26.8139, -65.3167),
  ('tucuman', 'barrio-sur', 'Barrio Sur', -26.8375, -65.2133),
  ('tucuman', 'villa-lujan', 'Villa Luján', -26.8347, -65.2431),
  ('tucuman', 'parque-9-de-julio', 'Parque 9 de Julio', -26.8236, -65.1958),
  ('tucuman', 'tafi-viejo', 'Tafí Viejo', -26.7325, -65.2597),
  ('salta', 'salta-centro', 'Centro', -24.7883, -65.4106),
  ('salta', 'tres-cerritos', 'Tres Cerritos', -24.7692, -65.3906),
  ('salta', 'grand-bourg', 'Grand Bourg', -24.7419, -65.4181),
  ('salta', 'san-lorenzo', 'San Lorenzo', -24.7264, -65.4906),
  ('salta', 'barrio-norte', 'Barrio Norte', -24.7761, -65.4114),
  ('salta', 'limache', 'Limache', -24.7981, -65.4497),
  ('salta', 'portezuelo', 'Portezuelo', -24.7539, -65.3781),
  ('santa_fe', 'sfe-centro', 'Centro', -31.6417, -60.7),
  ('santa_fe', 'candioti', 'Candioti', -31.6236, -60.6969),
  ('santa_fe', 'guadalupe', 'Guadalupe', -31.6039, -60.6906),
  ('santa_fe', 'costanera', 'Costanera', -31.6236, -60.6803),
  ('santa_fe', 'barrio-sur', 'Barrio Sur', -31.6531, -60.7011),
  ('santa_fe', 'recoleta', 'Recoleta', -31.6167, -60.7083),
  ('santa_fe', 'santo-tome', 'Santo Tomé', -31.6653, -60.7639),
  ('parana', 'parana-centro', 'Centro', -31.7319, -60.5238),
  ('parana', 'puerto-viejo', 'Puerto Viejo', -31.7194, -60.5153),
  ('parana', 'parque-urquiza', 'Parque Urquiza', -31.7239, -60.5306),
  ('parana', 'barrio-sur', 'Barrio Sur', -31.7472, -60.5222),
  ('parana', 'villa-sarmiento', 'Villa Sarmiento', -31.7181, -60.5497),
  ('parana', 'bajada-grande', 'Bajada Grande', -31.7583, -60.5583),
  ('corrientes', 'ctes-centro', 'Centro', -27.4692, -58.8306),
  ('corrientes', 'costanera', 'Costanera', -27.4644, -58.8231),
  ('corrientes', 'villa-cabral', 'Villa Cabral', -27.4778, -58.8542),
  ('corrientes', 'camba-cua', 'Cambá Cuá', -27.4831, -58.8153),
  ('corrientes', 'barrio-aldana', 'Aldana', -27.4917, -58.8306),
  ('corrientes', 'santa-catalina', 'Santa Catalina', -27.4569, -58.8639),
  ('resistencia', 'res-centro', 'Centro', -27.4514, -58.9867),
  ('resistencia', 'villa-don-andres', 'Villa Don Andrés', -27.4361, -59.0111),
  ('resistencia', 'barranqueras', 'Barranqueras', -27.4833, -58.9333),
  ('resistencia', 'villa-sarmiento', 'Villa Sarmiento', -27.4694, -59.0056),
  ('resistencia', 'fontana', 'Fontana', -27.4194, -59.0417),
  ('posadas', 'psd-centro', 'Centro', -27.3671, -55.8961),
  ('posadas', 'villa-cabello', 'Villa Cabello', -27.3453, -55.9306),
  ('posadas', 'itaembe-mini', 'Itaembé Miní', -27.3819, -55.9694),
  ('posadas', 'costanera', 'Costanera', -27.3597, -55.8878),
  ('posadas', 'villa-urquiza', 'Villa Urquiza', -27.3781, -55.9083),
  ('posadas', 'garupa', 'Garupá', -27.4833, -55.8333),
  ('neuquen', 'nqn-centro', 'Centro', -38.9516, -68.0591),
  ('neuquen', 'confluencia', 'Confluencia', -38.9722, -68.0972),
  ('neuquen', 'barrio-nuevo', 'Barrio Nuevo', -38.9333, -68.0722),
  ('neuquen', 'santa-genoveva', 'Santa Genoveva', -38.9436, -68.0475),
  ('neuquen', 'bajada-nueva', 'Bajada Nueva', -38.9711, -68.0642),
  ('neuquen', 'plottier', 'Plottier', -38.9639, -68.2361),
  ('neuquen', 'cipolletti', 'Cipolletti', -38.9339, -67.9903),
  ('bahia_blanca', 'bb-centro', 'Centro', -38.7183, -62.2661),
  ('bahia_blanca', 'villa-mitre', 'Villa Mitre', -38.7031, -62.2894),
  ('bahia_blanca', 'universitario', 'Universitario', -38.6983, -62.2497),
  ('bahia_blanca', 'palihue', 'Palihue', -38.6944, -62.2708),
  ('bahia_blanca', 'ingeniero-white', 'Ingeniero White', -38.7778, -62.2694),
  ('bahia_blanca', 'patagonia', 'Patagonia', -38.7361, -62.2417),
  ('tandil', 'tdl-centro', 'Centro', -37.3217, -59.1332),
  ('tandil', 'villa-italia', 'Villa Italia', -37.3389, -59.1481),
  ('tandil', 'cerro-leones', 'Cerro Leones', -37.3, -59.1417),
  ('tandil', 'la-movediza', 'La Movediza', -37.3056, -59.1667),
  ('tandil', 'parque-independencia', 'Parque Independencia', -37.3306, -59.1264),
  ('tandil', 'villa-del-parque', 'Villa del Parque', -37.3128, -59.1544),
  ('pinamar', 'pinamar-centro', 'Centro', -37.1069, -56.8592),
  ('pinamar', 'pinamar-norte', 'Pinamar Norte', -37.0806, -56.8464),
  ('pinamar', 'ostende', 'Ostende', -37.1389, -56.8833),
  ('pinamar', 'valeria-del-mar', 'Valeria del Mar', -37.1611, -56.8931),
  ('pinamar', 'carilo', 'Cariló', -37.1783, -56.8992),
  ('pinamar', 'la-frontera', 'La Frontera', -37.0611, -56.8342),
  ('villa_gesell', 'vg-centro', 'Centro', -37.2639, -56.9731),
  ('villa_gesell', 'vg-norte', 'Barrio Norte', -37.2361, -56.9611),
  ('villa_gesell', 'vg-sur', 'Barrio Sur', -37.2861, -56.9861),
  ('villa_gesell', 'mar-de-las-pampas', 'Mar de las Pampas', -37.3236, -57.0089),
  ('villa_gesell', 'las-gaviotas', 'Las Gaviotas', -37.3389, -57.0139),
  ('villa_gesell', 'mar-azul', 'Mar Azul', -37.3444, -57.0181),
  ('san_bernardo', 'san-bernardo-centro', 'San Bernardo', -36.6939, -56.6803),
  ('san_bernardo', 'mar-de-ajo', 'Mar de Ajó', -36.7222, -56.6706),
  ('san_bernardo', 'costa-azul', 'Costa Azul', -36.6708, -56.6903),
  ('san_bernardo', 'aguas-verdes', 'Aguas Verdes', -36.6444, -56.6944),
  ('san_bernardo', 'la-lucila-del-mar', 'La Lucila del Mar', -36.6597, -56.6889),
  ('miramar', 'miramar-centro', 'Centro', -38.2667, -57.8394),
  ('miramar', 'vivero', 'Vivero Dunícola', -38.2792, -57.8181),
  ('miramar', 'mir-norte', 'Barrio Norte', -38.2547, -57.8494),
  ('miramar', 'mar-del-sud', 'Mar del Sud', -38.3417, -57.9833),
  ('necochea', 'nec-centro', 'Centro', -38.5545, -58.7396),
  ('necochea', 'la-virazon', 'La Virazón', -38.5806, -58.7333),
  ('necochea', 'quequen', 'Quequén', -38.5667, -58.7),
  ('necochea', 'parque-miguel-lillo', 'Parque Miguel Lillo', -38.5722, -58.75),
  ('villa_carlos_paz', 'vcp-centro', 'Centro', -31.4241, -64.4978),
  ('villa_carlos_paz', 'villa-del-lago', 'Villa del Lago', -31.4064, -64.4881),
  ('villa_carlos_paz', 'playas-de-oro', 'Playas de Oro', -31.4361, -64.4864),
  ('villa_carlos_paz', 'san-nicolas', 'San Nicolás', -31.4472, -64.5139),
  ('villa_carlos_paz', 'costa-azul', 'Costa Azul', -31.3917, -64.4778),
  ('villa_carlos_paz', 'cuesta-blanca', 'Cuesta Blanca', -31.4861, -64.5722),
  ('rio_cuarto', 'rc-centro', 'Centro', -33.1307, -64.3499),
  ('rio_cuarto', 'banda-norte', 'Banda Norte', -33.1114, -64.3319),
  ('rio_cuarto', 'alberdi', 'Alberdi', -33.1236, -64.3611),
  ('rio_cuarto', 'golf', 'Golf', -33.1042, -64.3639),
  ('rio_cuarto', 'las-ferias', 'Las Ferias', -33.1444, -64.3556),
  ('san_juan', 'sj-centro', 'Centro', -31.5375, -68.5364),
  ('san_juan', 'rivadavia', 'Rivadavia', -31.5333, -68.5833),
  ('san_juan', 'santa-lucia', 'Santa Lucía', -31.5333, -68.5),
  ('san_juan', 'rawson', 'Rawson', -31.5833, -68.5333),
  ('san_juan', 'chimbas', 'Chimbas', -31.5, -68.5333),
  ('san_juan', 'pocito', 'Pocito', -31.6333, -68.55),
  ('san_luis', 'sl-centro', 'Centro', -33.3017, -66.3378),
  ('san_luis', 'sl-norte', 'Barrio Norte', -33.2833, -66.3306),
  ('san_luis', 'juana-koslay', 'Juana Koslay', -33.2861, -66.2611),
  ('san_luis', 'el-volcan', 'El Volcán', -33.245, -66.1836),
  ('san_luis', 'la-punta', 'La Punta', -33.2028, -66.3167),
  ('san_rafael', 'sr-centro', 'Centro', -34.6177, -68.3301),
  ('san_rafael', 'cuadro-nacional', 'Cuadro Nacional', -34.5806, -68.3667),
  ('san_rafael', 'valle-grande', 'Valle Grande', -34.7833, -68.4),
  ('san_rafael', 'las-paredes', 'Las Paredes', -34.5847, -68.4194),
  ('san_rafael', 'rama-caida', 'Rama Caída', -34.6694, -68.3778),
  ('jujuy', 'juj-centro', 'Centro', -24.1858, -65.2995),
  ('jujuy', 'alto-comedero', 'Alto Comedero', -24.2528, -65.2694),
  ('jujuy', 'ciudad-de-nieva', 'Ciudad de Nieva', -24.1889, -65.3214),
  ('jujuy', 'los-perales', 'Los Perales', -24.1694, -65.2917),
  ('jujuy', 'palpala', 'Palpalá', -24.2556, -65.2075),
  ('jujuy', 'yala', 'Yala', -24.1194, -65.3833),
  ('catamarca', 'cat-centro', 'Centro', -28.4696, -65.7852),
  ('catamarca', 'valle-viejo', 'Valle Viejo', -28.4667, -65.7333),
  ('catamarca', 'cat-norte', 'Barrio Norte', -28.4506, -65.7889),
  ('catamarca', 'el-jumeal', 'El Jumeal', -28.4444, -65.7694),
  ('catamarca', 'fray-mamerto-esquiu', 'Fray Mamerto Esquiú', -28.4083, -65.7556),
  ('la_rioja', 'lr-centro', 'Centro', -29.4131, -66.8558),
  ('la_rioja', 'vargas', 'Vargas', -29.3944, -66.8444),
  ('la_rioja', 'joaquin-v-gonzalez', 'Joaquín V. González', -29.4306, -66.8722),
  ('la_rioja', 'las-lomas', 'Las Lomas', -29.3861, -66.8722),
  ('la_rioja', 'el-faldeo', 'El Faldeo', -29.3722, -66.8917),
  ('santiago_del_estero', 'sde-centro', 'Centro', -27.7951, -64.2615),
  ('santiago_del_estero', 'la-banda', 'La Banda', -27.7333, -64.2417),
  ('santiago_del_estero', 'sde-norte', 'Barrio Norte', -27.7778, -64.2583),
  ('santiago_del_estero', 'parque-aguirre', 'Parque Aguirre', -27.7833, -64.2528),
  ('santiago_del_estero', 'autonomia', 'Autonomía', -27.8083, -64.2694),
  ('formosa', 'fsa-centro', 'Centro', -26.1849, -58.1731),
  ('formosa', 'costanera', 'Costanera', -26.1764, -58.1656),
  ('formosa', 'san-miguel', 'San Miguel', -26.1972, -58.1917),
  ('formosa', 'villa-hermosa', 'Villa Hermosa', -26.2083, -58.2028),
  ('rio_gallegos', 'rgl-centro', 'Centro', -51.6226, -69.2181),
  ('rio_gallegos', 'rgl-sur', 'Zona Sur', -51.6389, -69.2306),
  ('rio_gallegos', 'san-benito', 'San Benito', -51.6083, -69.2444),
  ('rio_gallegos', 'gregores', 'Gregores', -51.6139, -69.2028),
  ('comodoro_rivadavia', 'crd-centro', 'Centro', -45.8641, -67.4966),
  ('comodoro_rivadavia', 'rada-tilly', 'Rada Tilly', -45.9333, -67.5528),
  ('comodoro_rivadavia', 'km-3', 'Km 3', -45.8347, -67.4778),
  ('comodoro_rivadavia', 'km-8', 'Km 8', -45.7917, -67.4583),
  ('comodoro_rivadavia', 'general-mosconi', 'General Mosconi', -45.7889, -67.4694),
  ('puerto_madryn', 'pmy-centro', 'Centro', -42.7692, -65.0385),
  ('puerto_madryn', 'pmy-norte', 'Zona Norte', -42.7472, -65.0139),
  ('puerto_madryn', 'punta-cuevas', 'Punta Cuevas', -42.7889, -65.0139),
  ('puerto_madryn', 'el-doradillo', 'El Doradillo', -42.6667, -64.9833),
  ('puerto_madryn', 'pmy-sur', 'Zona Sur', -42.7889, -65.0528),
  ('trelew', 'rel-centro', 'Centro', -43.2489, -65.3051),
  ('trelew', 'rel-norte', 'Barrio Norte', -43.2333, -65.3),
  ('trelew', 'rawson', 'Rawson', -43.3, -65.1),
  ('trelew', 'gaiman', 'Gaiman', -43.2894, -65.4922),
  ('ushuaia', 'ush-centro', 'Centro', -54.8019, -68.303),
  ('ushuaia', 'bahia-encerrada', 'Bahía Encerrada', -54.8036, -68.3167),
  ('ushuaia', 'andorra', 'Andorra', -54.7683, -68.3417),
  ('ushuaia', 'rio-pipo', 'Río Pipo', -54.7833, -68.3667),
  ('ushuaia', 'cerro-castor', 'Cerro Castor', -54.7333, -68.0167),
  ('ushuaia', 'bahia-golondrina', 'Bahía Golondrina', -54.8167, -68.35),
  ('el_bolson', 'ebo-centro', 'Centro', -41.9686, -71.534),
  ('el_bolson', 'lago-puelo', 'Lago Puelo', -42.0806, -71.6),
  ('el_bolson', 'mallin-ahogado', 'Mallín Ahogado', -41.9111, -71.5389),
  ('el_bolson', 'cerro-piltriquitron', 'Piltriquitrón', -41.9694, -71.4833),
  ('el_bolson', 'villa-turismo', 'Villa Turismo', -41.9806, -71.5194),
  ('san_martin_de_los_andes', 'sma-centro', 'Centro', -40.1579, -71.3529),
  ('san_martin_de_los_andes', 'chapelco', 'Chapelco', -40.2278, -71.2944),
  ('san_martin_de_los_andes', 'costanera', 'Costanera', -40.1639, -71.3556),
  ('san_martin_de_los_andes', 'vega-maipu', 'Vega Maipú', -40.1444, -71.3389),
  ('san_martin_de_los_andes', 'quila-quina', 'Quila Quina', -40.1861, -71.4306),
  ('villa_la_angostura', 'vla-centro', 'Centro', -40.757, -71.6486),
  ('villa_la_angostura', 'puerto-manzano', 'Puerto Manzano', -40.7333, -71.6),
  ('villa_la_angostura', 'bahia-brava', 'Bahía Brava', -40.7639, -71.6667),
  ('villa_la_angostura', 'cerro-bayo', 'Cerro Bayo', -40.7444, -71.5722),
  ('villa_la_angostura', 'la-villa', 'La Villa', -40.7806, -71.6528),
  ('esquel', 'eqs-centro', 'Centro', -42.9092, -71.3151),
  ('esquel', 'la-hoya', 'La Hoya', -42.8333, -71.3),
  ('esquel', 'trevelin', 'Trevelin', -43.0833, -71.4667),
  ('esquel', 'baden', 'Badén', -42.9222, -71.3306),
  ('viedma', 'vdm-centro', 'Centro', -40.8135, -62.9967),
  ('viedma', 'carmen-de-patagones', 'Carmen de Patagones', -40.7994, -62.9836),
  ('viedma', 'el-condor', 'El Cóndor', -41.0472, -62.8236),
  ('viedma', 'costanera', 'Costanera', -40.8083, -62.9917),
  ('concordia', 'cda-centro', 'Centro', -31.3929, -58.0209),
  ('concordia', 'costanera', 'Costanera', -31.3861, -58.0056),
  ('concordia', 'villa-zorraquin', 'Villa Zorraquín', -31.3472, -58.0139),
  ('concordia', 'las-termas', 'Las Termas', -31.3306, -58.0333),
  ('gualeguaychu', 'gch-centro', 'Centro', -33.0092, -58.5172),
  ('gualeguaychu', 'costanera', 'Costanera', -33.0056, -58.5083),
  ('gualeguaychu', 'corsodromo', 'Corsódromo', -32.9917, -58.5139),
  ('gualeguaychu', 'nandubaysal', 'Ñandubaysal', -33.0667, -58.4139),
  ('rafaela', 'raf-centro', 'Centro', -31.2503, -61.4867),
  ('rafaela', 'barranquitas', 'Barranquitas', -31.2361, -61.4972),
  ('rafaela', 'villa-rosas', 'Villa Rosas', -31.2639, -61.4778),
  ('rafaela', 'parque-balneario', 'Parque Balneario', -31.2417, -61.5028),
  ('san_nicolas', 'sns-centro', 'Centro', -33.3358, -60.2119),
  ('san_nicolas', 'costanera', 'Costanera', -33.3306, -60.2028),
  ('san_nicolas', 'sns-norte', 'Barrio Norte', -33.3167, -60.2222),
  ('san_nicolas', 'somisa', 'Somisa', -33.3611, -60.1833),
  ('junin', 'jun-centro', 'Centro', -34.5836, -60.9464),
  ('junin', 'laguna-de-gomez', 'Laguna de Gómez', -34.6667, -61.0333),
  ('junin', 'villa-belgrano', 'Villa Belgrano', -34.5694, -60.9583),
  ('junin', 'barrio-sur', 'Barrio Sur', -34.5972, -60.9417)
on conflict (city_key, key) do update set
  label = excluded.label, lat = excluded.lat, lng = excluded.lng;

-- <<< END SEED GENERADO

-- ──────────────── 3. `parties.city` valida contra el catálogo ────

-- El `check (city in ('la_plata','caba','bariloche'))` de 0001 era el techo
-- duro: con él no se podía crear una previa en ninguna otra ciudad.
alter table public.parties drop constraint if exists parties_city_check;

alter table public.parties drop constraint if exists parties_city_fkey;
alter table public.parties
  add constraint parties_city_fkey
  foreign key (city) references public.cities(key) on update cascade;

-- Límite legal por ciudad. Reemplaza los seis `case when p_city = 'la_plata'`
-- repartidos por las migraciones. El default de 40 es el que ya se aplicaba a
-- toda ciudad que no fuera La Plata.
create or replace function public.city_legal_limit(p_city text)
returns int
language sql stable set search_path = public as $$
  select coalesce((select c.legal_limit from public.cities c where c.key = p_city), 40);
$$;

revoke all on function public.city_legal_limit(text) from public, anon;
grant execute on function public.city_legal_limit(text) to authenticated;

-- ──────────── 4. create_party sin la lista clavada ──────────────
-- Igual a la versión de 0007, con dos cambios: la guarda `BAD_CITY` consulta
-- el catálogo, y el límite legal sale de `city_legal_limit`.

create or replace function public.create_party(
  p_title text,
  p_description text,
  p_city text,
  p_zone text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_start_at timestamptz,
  p_max_people int,
  p_type text,
  p_legal_ok boolean,
  p_arrival_notes text,
  p_whatsapp_number text,
  p_genres text[],
  p_venue_type text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_count int;
  v_limit int;
  v_blur record;
  v_whatsapp text;
  v_genres text[];
  v_venue text;
begin
  if v_uid is null then raise exception 'NOT_AUTH'; end if;

  select count(*) into v_count from public.parties
  where host_id = v_uid and created_at > now() - interval '24 hours';
  if v_count >= 3 then raise exception 'SPAM_LIMIT'; end if;

  if p_title is null or length(trim(p_title)) < 3 then raise exception 'BAD_TITLE'; end if;
  -- La FK ya garantiza la integridad; esta guarda existe para seguir
  -- devolviendo 'BAD_CITY' (el cliente lo traduce a un mensaje humano) en vez
  -- de un error de constraint de Postgres.
  if not exists (select 1 from public.cities c where c.key = p_city and c.active) then
    raise exception 'BAD_CITY';
  end if;
  if p_zone is null or length(trim(p_zone)) = 0 then raise exception 'BAD_ZONE'; end if;
  if p_start_at is null or p_start_at < now() - interval '5 minutes' then raise exception 'BAD_DATE'; end if;
  if p_max_people is null or p_max_people < 1 or p_max_people > 500 then raise exception 'BAD_CAPACITY'; end if;
  if p_type not in ('private','open') then raise exception 'BAD_TYPE'; end if;

  -- Dirección y pin: sin esto la previa no sirve para nada.
  if p_address is null or length(trim(p_address)) < 5 then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_lat is null or p_lng is null then raise exception 'PIN_REQUIRED'; end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then raise exception 'PIN_REQUIRED'; end if;

  -- Géneros: al menos uno, máximo cuatro, sin repetidos ni vacíos.
  select coalesce(array_agg(distinct g), '{}'::text[])
    into v_genres
  from unnest(coalesce(p_genres, '{}'::text[])) as g
  where g is not null and length(trim(g)) > 0;

  if array_length(v_genres, 1) is null then raise exception 'GENRES_REQUIRED'; end if;
  if array_length(v_genres, 1) > 4 then raise exception 'TOO_MANY_GENRES'; end if;

  v_venue := nullif(trim(coalesce(p_venue_type, '')), '');
  if v_venue is not null and v_venue not in (
    'casa','depto','quinta','terraza','salon','camping','barco','yate','catamaran','playa'
  ) then
    raise exception 'BAD_VENUE';
  end if;

  v_whatsapp := nullif(trim(coalesce(p_whatsapp_number, '')), '');
  if v_whatsapp is not null and v_whatsapp !~ '^\+?[0-9]{8,15}$' then
    raise exception 'BAD_WHATSAPP';
  end if;

  v_limit := public.city_legal_limit(p_city);
  if p_max_people > v_limit and p_legal_ok is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  select * into v_blur from public.blur_point(p_lat, p_lng, v_id);

  insert into public.parties (
    id, host_id, title, description, city, zone_text,
    address_hidden, lat_hidden, lng_hidden, arrival_notes, whatsapp_number,
    approx_area, lat_approx, lng_approx,
    start_at, expires_at, max_people, type, legal_accepted,
    genres, venue_type
  ) values (
    v_id, v_uid, trim(p_title), p_description, p_city, trim(p_zone),
    trim(p_address), p_lat, p_lng, nullif(trim(coalesce(p_arrival_notes, '')), ''), v_whatsapp,
    public.blur_address(trim(p_address)), v_blur.lat, v_blur.lng,
    p_start_at, p_start_at + interval '8 hours',
    p_max_people, p_type, coalesce(p_legal_ok, false),
    v_genres, v_venue
  );

  return v_id;
end; $$;

revoke all on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text, text[], text
) from public, anon;
grant execute on function public.create_party(
  text, text, text, text, text, double precision, double precision,
  timestamptz, int, text, boolean, text, text, text[], text
) to authenticated;

-- ──────────── 5. host_update_party: mismo límite por catálogo ────
-- Idéntica a la de 0007 salvo la línea del límite legal. Si esto quedaba con
-- el `case` viejo, un host de una ciudad nueva con límite 50 no podía editar
-- su propia previa: la validación de creación y la de edición discrepaban.

create or replace function public.host_update_party(
  p_id uuid, p_title text, p_description text, p_arrival_notes text,
  p_whatsapp_number text, p_max_people int,
  p_genres text[] default null, p_venue_type text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_party public.parties%rowtype;
  v_limit int;
  v_whatsapp text;
  v_genres text[];
  v_venue text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTH'; end if;
  select * into v_party from public.parties where id = p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_party.host_id <> auth.uid() then raise exception 'NOT_HOST'; end if;
  if v_party.status <> 'active' then raise exception 'PARTY_NOT_ACTIVE'; end if;
  if p_title is null or length(trim(p_title)) < 3 then raise exception 'BAD_TITLE'; end if;
  if p_max_people is null or p_max_people < 1 or p_max_people > 500 then raise exception 'BAD_CAPACITY'; end if;
  if p_max_people < v_party.attendees_count then raise exception 'CAPACITY_BELOW_ATTENDEES'; end if;

  v_whatsapp := nullif(trim(coalesce(p_whatsapp_number, '')), '');
  if v_whatsapp is not null and v_whatsapp !~ '^\+?[0-9]{8,15}$' then
    raise exception 'BAD_WHATSAPP';
  end if;

  -- null = no tocar los géneros. Array vacío sí es un error explícito.
  if p_genres is null then
    v_genres := v_party.genres;
  else
    select coalesce(array_agg(distinct g), '{}'::text[])
      into v_genres
    from unnest(p_genres) as g
    where g is not null and length(trim(g)) > 0;
    if array_length(v_genres, 1) is null then raise exception 'GENRES_REQUIRED'; end if;
    if array_length(v_genres, 1) > 4 then raise exception 'TOO_MANY_GENRES'; end if;
  end if;

  v_venue := nullif(trim(coalesce(p_venue_type, '')), '');
  if v_venue is null then
    v_venue := v_party.venue_type;
  elsif v_venue not in (
    'casa','depto','quinta','terraza','salon','camping','barco','yate','catamaran','playa'
  ) then
    raise exception 'BAD_VENUE';
  end if;

  v_limit := public.city_legal_limit(v_party.city);
  if p_max_people > v_limit and v_party.legal_accepted is not true then
    raise exception 'LEGAL_REQUIRED';
  end if;

  update public.parties set
    title = trim(p_title),
    description = p_description,
    arrival_notes = nullif(trim(coalesce(p_arrival_notes, '')), ''),
    whatsapp_number = v_whatsapp,
    max_people = p_max_people,
    genres = v_genres,
    venue_type = v_venue
  where id = p_id;

  -- Si el host saca un género, los temas pedidos con ese género quedan
  -- fuera de la fiesta: se borran para que la lista del DJ siga siendo
  -- "acorde al género", que es la única regla que tiene.
  delete from public.party_song_requests
  where party_id = p_id and genre <> all(v_genres);
end; $$;

revoke all on function public.host_update_party(uuid, text, text, text, text, int, text[], text) from public, anon;
grant execute on function public.host_update_party(uuid, text, text, text, text, int, text[], text) to authenticated;

-- ──────────── 6. Pines por recuadro visible del mapa ────────────
-- El mapa dibujaba las zonas de UNA ciudad, tomadas del array de JS. Con el
-- país entero eso no escala y, peor, obliga a elegir ciudad antes de ver algo.
-- Este RPC devuelve las zonas con previas activas dentro del recuadro que el
-- usuario está mirando, sin importar de qué ciudad sean.
--
-- Nunca toca `lat_hidden` / `lng_hidden`: agrupa por zona del catálogo, así
-- que la coordenada que sale es la del barrio, no la de la casa de nadie.

create index if not exists parties_active_bbox_idx
  on public.parties (city, zone_text)
  where status = 'active';

create or replace function public.zones_in_bbox(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_limit int default 200
)
returns table (
  city_key text, city_label text, zone_key text, zone_label text,
  lat double precision, lng double precision, party_count bigint,
  has_space boolean, is_new boolean
)
language sql security definer stable set search_path = public as $$
  select z.city_key, c.label, z.key, z.label, z.lat, z.lng, count(p.id)::bigint,
    -- Los dos motivos por los que a alguien le conviene tocar este pin:
    -- que todavía entre, y que sea nuevo. El mapa los anima distinto.
    count(p.id) filter (where p.attendees_count < p.max_people) > 0,
    max(p.created_at) > now() - interval '1 hour'
  from public.zones z
  join public.cities c on c.key = z.city_key
  join public.parties p
    on p.city = z.city_key and p.zone_text = z.key
   -- Mismo gate que la policy `parties_select`: si una previa no se puede
   -- leer, tampoco puede aparecer como pin en el mapa.
   and p.status = 'active' and p.expires_at > now()
  where z.lat between p_min_lat and p_max_lat
    and z.lng between p_min_lng and p_max_lng
  group by z.city_key, c.label, z.key, z.label, z.lat, z.lng
  order by count(p.id) desc, z.label asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.zones_in_bbox(
  double precision, double precision, double precision, double precision, int
) from public, anon;
grant execute on function public.zones_in_bbox(
  double precision, double precision, double precision, double precision, int
) to authenticated;
