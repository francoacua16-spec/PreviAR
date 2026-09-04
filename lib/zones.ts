/**
 * Catálogo de ciudades y zonas.
 *
 * Este archivo es la fuente autorizada del catálogo: `scripts/gen-zones-seed.mjs`
 * lo lee y genera el seed SQL de las tablas `cities` / `zones` (migración 0009),
 * así que no hay dos listas que puedan divergir. Se autora acá y no en SQL
 * porque el render necesita resolver `zoneLabel()` de forma síncrona, sin
 * esperar una consulta: los nombres de barrio aparecen en toda la app.
 *
 * La base es igual la autoridad sobre lo que importa: valida `parties.city` por
 * FK, decide el límite legal de cada ciudad, y sirve los pines del mapa por
 * bounding box. Agregar una ciudad = agregarla acá y correr `npm run gen:zones`.
 */

export type City = string

export interface Zone {
  key: string
  label: string
  lat: number
  lng: number
}

export interface CityDef {
  key: City
  label: string
  short: string
  center: { lat: number; lng: number }
  /** Provincia. Se muestra en el buscador para desambiguar homónimos. */
  province: string
  /**
   * Radio en el que consideramos que el mapa "está" en esta ciudad. Antes era
   * una constante global de 30 km, que servía cuando había tres ciudades a más
   * de 50 km entre sí. Con el país entero, un radio fijo pega zonas de ciudades
   * vecinas: el Gran Buenos Aires tiene partidos a 8 km uno del otro.
   */
  radiusM: number
  /** Tope de personas antes de que la app pida aceptar el aviso legal. */
  legalLimit: number
  zones: Zone[]
}

function z(key: string, label: string, lat: number, lng: number): Zone {
  return { key, label, lat, lng }
}

export const CITIES: CityDef[] = [
  {
    key: 'la_plata',
    label: 'La Plata',
    short: 'LP',
    province: 'Buenos Aires',
    center: { lat: -34.9215, lng: -57.9545 },
    radiusM: 30000,
    legalLimit: 50,
    zones: [
      z('tolosa', 'Tolosa', -34.9078, -57.975),
      z('city-bell', 'City Bell', -34.8861, -58.0522),
      z('la-loma', 'La Loma', -34.9372, -57.9667),
      z('barrio-norte', 'Barrio Norte', -34.9, -57.9528),
      z('centro', 'Centro', -34.9215, -57.9545),
      z('gonnet', 'Gonnet', -34.8778, -58.01),
      z('los-hornos', 'Los Hornos', -34.9722, -57.9733),
      z('ringuelet', 'Ringuelet', -34.8917, -57.9744),
      z('villa-elisa', 'Villa Elisa', -34.8625, -58.0819),
      z('el-mondongo', 'El Mondongo', -34.9308, -57.9264),
      z('meridiano-v', 'Meridiano V', -34.9153, -57.9639),
      z('abasto', 'Abasto', -35.0167, -57.9667),
      z('san-carlos', 'San Carlos', -34.9481, -58.0106),
      z('altos-de-san-lorenzo', 'Altos de San Lorenzo', -34.9367, -57.9439),
      z('olmos', 'Olmos', -34.9506, -58.0119),
      z('arturo-segui', 'Arturo Seguí', -34.8961, -58.0308),
      z('villa-castells', 'Villa Castells', -34.8797, -58.0389),
      z('hernandez', 'Hernández', -34.8664, -58.0722),
    ],
  },
  {
    key: 'caba',
    label: 'CABA',
    short: 'BA',
    province: 'Ciudad de Buenos Aires',
    center: { lat: -34.6037, lng: -58.3816 },
    radiusM: 25000,
    legalLimit: 40,
    zones: [
      z('palermo', 'Palermo', -34.5883, -58.4306),
      z('belgrano', 'Belgrano', -34.5625, -58.4583),
      z('nunez', 'Nuñez', -34.5472, -58.4667),
      z('villa-crespo', 'Villa Crespo', -34.6033, -58.4394),
      z('caballito', 'Caballito', -34.6125, -58.4431),
      z('san-telmo', 'San Telmo', -34.6211, -58.3714),
      z('recoleta', 'Recoleta', -34.5889, -58.3911),
      z('almagro', 'Almagro', -34.6089, -58.4206),
      z('boedo', 'Boedo', -34.6294, -58.4183),
      z('flores', 'Flores', -34.6283, -58.4633),
      z('floresta', 'Floresta', -34.6294, -58.4839),
      z('villa-urquiza', 'Villa Urquiza', -34.5761, -58.4864),
      z('colegiales', 'Colegiales', -34.5761, -58.4489),
      z('chacarita', 'Chacarita', -34.5872, -58.4544),
      z('barracas', 'Barracas', -34.6417, -58.3833),
      z('la-boca', 'La Boca', -34.6345, -58.3631),
      z('puerto-madero', 'Puerto Madero', -34.6083, -58.3625),
      z('constitucion', 'Constitución', -34.6264, -58.3811),
      z('retiro', 'Retiro', -34.5925, -58.3747),
      z('once', 'Once / Balvanera', -34.6089, -58.4056),
      z('villa-del-parque', 'Villa del Parque', -34.6014, -58.4886),
      z('saavedra', 'Saavedra', -34.5589, -58.4842),
    ],
  },
  {
    key: 'bariloche',
    label: 'Bariloche',
    short: 'BRC',
    province: 'Río Negro',
    center: { lat: -41.1335, lng: -71.3103 },
    radiusM: 30000,
    legalLimit: 40,
    zones: [
      z('centro', 'Centro', -41.1335, -71.3103),
      z('melipal', 'Melipal', -41.1275, -71.3672),
      z('las-victorias', 'Las Victorias', -41.1467, -71.3472),
      z('este', 'Este', -41.135, -71.25),
      z('km8', 'Km 8', -41.1233, -71.4017),
      z('circuito-chico', 'Circuito Chico', -41.0872, -71.5461),
      z('playa-bonita', 'Playa Bonita', -41.1213, -71.4075),
      z('colonia-suiza', 'Colonia Suiza', -41.1053, -71.5453),
      z('villa-los-coihues', 'Villa Los Coihues', -41.15, -71.4),
      z('lago-gutierrez', 'Lago Gutiérrez', -41.1836, -71.3839),
      z('cerro-otto', 'Cerro Otto', -41.1394, -71.3661),
      z('cerro-catedral', 'Cerro Catedral', -41.1656, -71.4425),
      z('pinar-de-arelauquen', 'Pinar de Arelauquen', -41.175, -71.385),
      z('bustillo-km12', 'Bustillo Km 12', -41.1178, -71.4436),
      z('bustillo-km18', 'Bustillo Km 18', -41.105, -71.5017),
      z('virgen-de-las-nieves', 'Virgen de las Nieves', -41.1444, -71.3),
      z('barrio-belgrano', 'Belgrano', -41.1417, -71.3117),
      z('nahuel-huapi', 'Nahuel Huapi', -41.15, -71.35),
    ],
  },
  {
    key: 'vicente_lopez',
    label: 'Vicente López',
    short: 'VL',
    province: 'Buenos Aires',
    center: { lat: -34.5265, lng: -58.4784 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('olivos', 'Olivos', -34.5083, -58.4894),
      z('florida', 'Florida', -34.5333, -58.4917),
      z('munro', 'Munro', -34.5261, -58.5222),
      z('la-lucila', 'La Lucila', -34.4986, -58.4844),
      z('vicente-lopez-centro', 'Centro', -34.5265, -58.4784),
      z('villa-martelli', 'Villa Martelli', -34.5583, -58.5),
      z('carapachay', 'Carapachay', -34.5306, -58.5361),
    ],
  },
  {
    key: 'san_isidro',
    label: 'San Isidro',
    short: 'SI',
    province: 'Buenos Aires',
    center: { lat: -34.4708, lng: -58.5128 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('san-isidro-centro', 'Centro', -34.4708, -58.5128),
      z('martinez', 'Martínez', -34.4906, -58.5028),
      z('acassuso', 'Acassuso', -34.4772, -58.5006),
      z('beccar', 'Beccar', -34.4611, -58.5308),
      z('boulogne', 'Boulogne', -34.5028, -58.5678),
      z('villa-adelina', 'Villa Adelina', -34.5194, -58.5497),
      z('la-horqueta', 'La Horqueta', -34.4736, -58.5556),
    ],
  },
  {
    key: 'tigre',
    label: 'Tigre',
    short: 'TIG',
    province: 'Buenos Aires',
    center: { lat: -34.4264, lng: -58.5796 },
    radiusM: 20000,
    legalLimit: 40,
    zones: [
      z('tigre-centro', 'Centro', -34.4264, -58.5796),
      z('nordelta', 'Nordelta', -34.4033, -58.6417),
      z('rincon-de-milberg', 'Rincón de Milberg', -34.4147, -58.6042),
      z('don-torcuato', 'Don Torcuato', -34.4903, -58.6208),
      z('general-pacheco', 'General Pacheco', -34.4581, -58.6392),
      z('el-delta', 'El Delta', -34.3833, -58.5333),
      z('benavidez', 'Benavídez', -34.4189, -58.6928),
    ],
  },
  {
    key: 'pilar',
    label: 'Pilar',
    short: 'PIL',
    province: 'Buenos Aires',
    center: { lat: -34.4585, lng: -58.9142 },
    radiusM: 20000,
    legalLimit: 40,
    zones: [
      z('pilar-centro', 'Centro', -34.4585, -58.9142),
      z('del-viso', 'Del Viso', -34.4269, -58.8),
      z('manuel-alberti', 'Manuel Alberti', -34.4472, -58.8542),
      z('villa-rosa', 'Villa Rosa', -34.3875, -58.9333),
      z('pilar-del-este', 'Pilar del Este', -34.4333, -58.85),
      z('la-lonja', 'La Lonja', -34.4833, -58.85),
    ],
  },
  {
    key: 'san_miguel',
    label: 'San Miguel',
    short: 'SM',
    province: 'Buenos Aires',
    center: { lat: -34.5433, lng: -58.7128 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('san-miguel-centro', 'Centro', -34.5433, -58.7128),
      z('bella-vista', 'Bella Vista', -34.5722, -58.6817),
      z('muniz', 'Muñiz', -34.5583, -58.7028),
      z('trujui', 'Trujui', -34.5667, -58.7583),
      z('jose-c-paz', 'José C. Paz', -34.5136, -58.7642),
    ],
  },
  {
    key: 'moron',
    label: 'Morón',
    short: 'MOR',
    province: 'Buenos Aires',
    center: { lat: -34.6534, lng: -58.6198 },
    radiusM: 13000,
    legalLimit: 40,
    zones: [
      z('moron-centro', 'Centro', -34.6534, -58.6198),
      z('castelar', 'Castelar', -34.6533, -58.6497),
      z('haedo', 'Haedo', -34.6431, -58.5931),
      z('el-palomar', 'El Palomar', -34.6122, -58.5906),
      z('villa-sarmiento', 'Villa Sarmiento', -34.6383, -58.5794),
      z('ituzaingo', 'Ituzaingó', -34.6583, -58.6683),
    ],
  },
  {
    key: 'avellaneda',
    label: 'Avellaneda',
    short: 'AVE',
    province: 'Buenos Aires',
    center: { lat: -34.6633, lng: -58.3653 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('avellaneda-centro', 'Centro', -34.6633, -58.3653),
      z('sarandi', 'Sarandí', -34.6864, -58.3428),
      z('wilde', 'Wilde', -34.7, -58.3167),
      z('dock-sud', 'Dock Sud', -34.65, -58.3417),
      z('villa-dominico', 'Villa Domínico', -34.6944, -58.3306),
      z('gerli', 'Gerli', -34.6825, -58.3733),
    ],
  },
  {
    key: 'lanus',
    label: 'Lanús',
    short: 'LAN',
    province: 'Buenos Aires',
    center: { lat: -34.7069, lng: -58.3925 },
    radiusM: 10000,
    legalLimit: 40,
    zones: [
      z('lanus-oeste', 'Lanús Oeste', -34.7069, -58.3925),
      z('lanus-este', 'Lanús Este', -34.7033, -58.3667),
      z('remedios-de-escalada', 'Remedios de Escalada', -34.7264, -58.3936),
      z('valentin-alsina', 'Valentín Alsina', -34.6708, -58.4106),
      z('monte-chingolo', 'Monte Chingolo', -34.7278, -58.3556),
    ],
  },
  {
    key: 'lomas_de_zamora',
    label: 'Lomas de Zamora',
    short: 'LZ',
    province: 'Buenos Aires',
    center: { lat: -34.7601, lng: -58.4006 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('lomas-centro', 'Centro', -34.7601, -58.4006),
      z('banfield', 'Banfield', -34.7433, -58.3933),
      z('temperley', 'Temperley', -34.7717, -58.3961),
      z('turdera', 'Turdera', -34.7889, -58.4025),
      z('llavallol', 'Llavallol', -34.7972, -58.4194),
      z('villa-fiorito', 'Villa Fiorito', -34.7069, -58.4406),
    ],
  },
  {
    key: 'quilmes',
    label: 'Quilmes',
    short: 'QUI',
    province: 'Buenos Aires',
    center: { lat: -34.7203, lng: -58.254 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('quilmes-centro', 'Centro', -34.7203, -58.254),
      z('bernal', 'Bernal', -34.7078, -58.2811),
      z('don-bosco', 'Don Bosco', -34.7008, -58.2942),
      z('ezpeleta', 'Ezpeleta', -34.7522, -58.2358),
      z('quilmes-oeste', 'Quilmes Oeste', -34.7283, -58.2842),
      z('la-ribera', 'La Ribera', -34.7083, -58.2278),
    ],
  },
  {
    key: 'berazategui',
    label: 'Berazategui',
    short: 'BZG',
    province: 'Buenos Aires',
    center: { lat: -34.7644, lng: -58.2117 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('berazategui-centro', 'Centro', -34.7644, -58.2117),
      z('hudson', 'Hudson', -34.7981, -58.1444),
      z('platanos', 'Plátanos', -34.7842, -58.1806),
      z('ranelagh', 'Ranelagh', -34.7803, -58.1719),
      z('villa-espana', 'Villa España', -34.7481, -58.2183),
    ],
  },
  {
    key: 'la_matanza',
    label: 'La Matanza',
    short: 'LM',
    province: 'Buenos Aires',
    center: { lat: -34.6667, lng: -58.5667 },
    radiusM: 22000,
    legalLimit: 40,
    zones: [
      z('ramos-mejia', 'Ramos Mejía', -34.6444, -58.5658),
      z('san-justo', 'San Justo', -34.6767, -58.5606),
      z('villa-luzuriaga', 'Villa Luzuriaga', -34.6675, -58.5883),
      z('isidro-casanova', 'Isidro Casanova', -34.7025, -58.5872),
      z('gregorio-de-laferrere', 'Gregorio de Laferrère', -34.7439, -58.5883),
      z('gonzalez-catan', 'González Catán', -34.7717, -58.6467),
      z('lomas-del-mirador', 'Lomas del Mirador', -34.6644, -58.5222),
    ],
  },
  {
    key: 'mar_del_plata',
    label: 'Mar del Plata',
    short: 'MDQ',
    province: 'Buenos Aires',
    center: { lat: -38.0055, lng: -57.5426 },
    radiusM: 25000,
    legalLimit: 40,
    zones: [
      z('mdq-centro', 'Centro', -38.0023, -57.5575),
      z('playa-grande', 'Playa Grande', -38.0264, -57.5311),
      z('la-perla', 'La Perla', -37.9903, -57.5453),
      z('guemes', 'Güemes', -38.0083, -57.5461),
      z('constitucion', 'Constitución', -37.9536, -57.5464),
      z('los-troncos', 'Los Troncos', -38.0181, -57.5386),
      z('punta-mogotes', 'Punta Mogotes', -38.0708, -57.5389),
      z('chauvin', 'Chauvín', -38.0139, -57.5433),
      z('puerto', 'Puerto', -38.0361, -57.5325),
      z('varese', 'Varese', -38.0139, -57.5333),
    ],
  },
  {
    key: 'rosario',
    label: 'Rosario',
    short: 'ROS',
    province: 'Santa Fe',
    center: { lat: -32.9442, lng: -60.6505 },
    radiusM: 20000,
    legalLimit: 40,
    zones: [
      z('rosario-centro', 'Centro', -32.9468, -60.6393),
      z('pichincha', 'Pichincha', -32.9333, -60.6472),
      z('fisherton', 'Fisherton', -32.9222, -60.7333),
      z('echesortu', 'Echesortu', -32.9494, -60.6725),
      z('arroyito', 'Arroyito', -32.9106, -60.6708),
      z('la-florida', 'La Florida', -32.8853, -60.6944),
      z('abasto', 'Abasto', -32.9622, -60.6647),
      z('puerto-norte', 'Puerto Norte', -32.9264, -60.6383),
      z('republica-de-la-sexta', 'República de la Sexta', -32.9583, -60.6392),
    ],
  },
  {
    key: 'cordoba',
    label: 'Córdoba',
    short: 'CBA',
    province: 'Córdoba',
    center: { lat: -31.4201, lng: -64.1888 },
    radiusM: 22000,
    legalLimit: 40,
    zones: [
      z('cordoba-centro', 'Centro', -31.4167, -64.1833),
      z('nueva-cordoba', 'Nueva Córdoba', -31.4306, -64.1861),
      z('guemes', 'Güemes', -31.4283, -64.1953),
      z('cerro-de-las-rosas', 'Cerro de las Rosas', -31.3811, -64.2308),
      z('alta-cordoba', 'Alta Córdoba', -31.3944, -64.1789),
      z('general-paz', 'General Paz', -31.4083, -64.1656),
      z('villa-belgrano', 'Villa Belgrano', -31.3833, -64.2583),
      z('alberdi', 'Alberdi', -31.4139, -64.2022),
      z('urca', 'Urca', -31.3922, -64.2244),
    ],
  },
  {
    key: 'mendoza',
    label: 'Mendoza',
    short: 'MDZ',
    province: 'Mendoza',
    center: { lat: -32.8895, lng: -68.8458 },
    radiusM: 25000,
    legalLimit: 40,
    zones: [
      z('mendoza-centro', 'Centro', -32.8895, -68.8458),
      z('quinta-seccion', 'Quinta Sección', -32.8956, -68.8567),
      z('godoy-cruz', 'Godoy Cruz', -32.925, -68.8333),
      z('chacras-de-coria', 'Chacras de Coria', -32.9847, -68.8778),
      z('guaymallen', 'Guaymallén', -32.8917, -68.7986),
      z('las-heras', 'Las Heras', -32.8497, -68.8317),
      z('maipu', 'Maipú', -32.9833, -68.7833),
      z('lujan-de-cuyo', 'Luján de Cuyo', -33.0361, -68.8792),
    ],
  },
  {
    key: 'tucuman',
    label: 'San Miguel de Tucumán',
    short: 'TUC',
    province: 'Tucumán',
    center: { lat: -26.8083, lng: -65.2176 },
    radiusM: 18000,
    legalLimit: 40,
    zones: [
      z('tuc-centro', 'Centro', -26.8241, -65.2226),
      z('barrio-norte', 'Barrio Norte', -26.8083, -65.2094),
      z('yerba-buena', 'Yerba Buena', -26.8139, -65.3167),
      z('barrio-sur', 'Barrio Sur', -26.8375, -65.2133),
      z('villa-lujan', 'Villa Luján', -26.8347, -65.2431),
      z('parque-9-de-julio', 'Parque 9 de Julio', -26.8236, -65.1958),
      z('tafi-viejo', 'Tafí Viejo', -26.7325, -65.2597),
    ],
  },
  {
    key: 'salta',
    label: 'Salta',
    short: 'SLA',
    province: 'Salta',
    center: { lat: -24.7859, lng: -65.4117 },
    radiusM: 18000,
    legalLimit: 40,
    zones: [
      z('salta-centro', 'Centro', -24.7883, -65.4106),
      z('tres-cerritos', 'Tres Cerritos', -24.7692, -65.3906),
      z('grand-bourg', 'Grand Bourg', -24.7419, -65.4181),
      z('san-lorenzo', 'San Lorenzo', -24.7264, -65.4906),
      z('barrio-norte', 'Barrio Norte', -24.7761, -65.4114),
      z('limache', 'Limache', -24.7981, -65.4497),
      z('portezuelo', 'Portezuelo', -24.7539, -65.3781),
    ],
  },
  {
    key: 'santa_fe',
    label: 'Santa Fe',
    short: 'SFE',
    province: 'Santa Fe',
    center: { lat: -31.6333, lng: -60.7 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('sfe-centro', 'Centro', -31.6417, -60.7),
      z('candioti', 'Candioti', -31.6236, -60.6969),
      z('guadalupe', 'Guadalupe', -31.6039, -60.6906),
      z('costanera', 'Costanera', -31.6236, -60.6803),
      z('barrio-sur', 'Barrio Sur', -31.6531, -60.7011),
      z('recoleta', 'Recoleta', -31.6167, -60.7083),
      z('santo-tome', 'Santo Tomé', -31.6653, -60.7639),
    ],
  },
  {
    key: 'parana',
    label: 'Paraná',
    short: 'PAR',
    province: 'Entre Ríos',
    center: { lat: -31.7333, lng: -60.5333 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('parana-centro', 'Centro', -31.7319, -60.5238),
      z('puerto-viejo', 'Puerto Viejo', -31.7194, -60.5153),
      z('parque-urquiza', 'Parque Urquiza', -31.7239, -60.5306),
      z('barrio-sur', 'Barrio Sur', -31.7472, -60.5222),
      z('villa-sarmiento', 'Villa Sarmiento', -31.7181, -60.5497),
      z('bajada-grande', 'Bajada Grande', -31.7583, -60.5583),
    ],
  },
  {
    key: 'corrientes',
    label: 'Corrientes',
    short: 'CTS',
    province: 'Corrientes',
    center: { lat: -27.4692, lng: -58.8306 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('ctes-centro', 'Centro', -27.4692, -58.8306),
      z('costanera', 'Costanera', -27.4644, -58.8231),
      z('villa-cabral', 'Villa Cabral', -27.4778, -58.8542),
      z('camba-cua', 'Cambá Cuá', -27.4831, -58.8153),
      z('barrio-aldana', 'Aldana', -27.4917, -58.8306),
      z('santa-catalina', 'Santa Catalina', -27.4569, -58.8639),
    ],
  },
  {
    key: 'resistencia',
    label: 'Resistencia',
    short: 'RES',
    province: 'Chaco',
    center: { lat: -27.4514, lng: -58.9867 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('res-centro', 'Centro', -27.4514, -58.9867),
      z('villa-don-andres', 'Villa Don Andrés', -27.4361, -59.0111),
      z('barranqueras', 'Barranqueras', -27.4833, -58.9333),
      z('villa-sarmiento', 'Villa Sarmiento', -27.4694, -59.0056),
      z('fontana', 'Fontana', -27.4194, -59.0417),
    ],
  },
  {
    key: 'posadas',
    label: 'Posadas',
    short: 'PSS',
    province: 'Misiones',
    center: { lat: -27.3671, lng: -55.8961 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('psd-centro', 'Centro', -27.3671, -55.8961),
      z('villa-cabello', 'Villa Cabello', -27.3453, -55.9306),
      z('itaembe-mini', 'Itaembé Miní', -27.3819, -55.9694),
      z('costanera', 'Costanera', -27.3597, -55.8878),
      z('villa-urquiza', 'Villa Urquiza', -27.3781, -55.9083),
      z('garupa', 'Garupá', -27.4833, -55.8333),
    ],
  },
  {
    key: 'neuquen',
    label: 'Neuquén',
    short: 'NQN',
    province: 'Neuquén',
    center: { lat: -38.9516, lng: -68.0591 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('nqn-centro', 'Centro', -38.9516, -68.0591),
      z('confluencia', 'Confluencia', -38.9722, -68.0972),
      z('barrio-nuevo', 'Barrio Nuevo', -38.9333, -68.0722),
      z('santa-genoveva', 'Santa Genoveva', -38.9436, -68.0475),
      z('bajada-nueva', 'Bajada Nueva', -38.9711, -68.0642),
      z('plottier', 'Plottier', -38.9639, -68.2361),
      z('cipolletti', 'Cipolletti', -38.9339, -67.9903),
    ],
  },
  {
    key: 'bahia_blanca',
    label: 'Bahía Blanca',
    short: 'BB',
    province: 'Buenos Aires',
    center: { lat: -38.7183, lng: -62.2661 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('bb-centro', 'Centro', -38.7183, -62.2661),
      z('villa-mitre', 'Villa Mitre', -38.7031, -62.2894),
      z('universitario', 'Universitario', -38.6983, -62.2497),
      z('palihue', 'Palihue', -38.6944, -62.2708),
      z('ingeniero-white', 'Ingeniero White', -38.7778, -62.2694),
      z('patagonia', 'Patagonia', -38.7361, -62.2417),
    ],
  },
  {
    key: 'tandil',
    label: 'Tandil',
    short: 'TDL',
    province: 'Buenos Aires',
    center: { lat: -37.3217, lng: -59.1332 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('tdl-centro', 'Centro', -37.3217, -59.1332),
      z('villa-italia', 'Villa Italia', -37.3389, -59.1481),
      z('cerro-leones', 'Cerro Leones', -37.3, -59.1417),
      z('la-movediza', 'La Movediza', -37.3056, -59.1667),
      z('parque-independencia', 'Parque Independencia', -37.3306, -59.1264),
      z('villa-del-parque', 'Villa del Parque', -37.3128, -59.1544),
    ],
  },
  {
    key: 'pinamar',
    label: 'Pinamar',
    short: 'PIN',
    province: 'Buenos Aires',
    center: { lat: -37.1069, lng: -56.8592 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('pinamar-centro', 'Centro', -37.1069, -56.8592),
      z('pinamar-norte', 'Pinamar Norte', -37.0806, -56.8464),
      z('ostende', 'Ostende', -37.1389, -56.8833),
      z('valeria-del-mar', 'Valeria del Mar', -37.1611, -56.8931),
      z('carilo', 'Cariló', -37.1783, -56.8992),
      z('la-frontera', 'La Frontera', -37.0611, -56.8342),
    ],
  },
  {
    key: 'villa_gesell',
    label: 'Villa Gesell',
    short: 'VG',
    province: 'Buenos Aires',
    center: { lat: -37.2639, lng: -56.9731 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('vg-centro', 'Centro', -37.2639, -56.9731),
      z('vg-norte', 'Barrio Norte', -37.2361, -56.9611),
      z('vg-sur', 'Barrio Sur', -37.2861, -56.9861),
      z('mar-de-las-pampas', 'Mar de las Pampas', -37.3236, -57.0089),
      z('las-gaviotas', 'Las Gaviotas', -37.3389, -57.0139),
      z('mar-azul', 'Mar Azul', -37.3444, -57.0181),
    ],
  },
  {
    key: 'san_bernardo',
    label: 'San Bernardo / Mar de Ajó',
    short: 'SB',
    province: 'Buenos Aires',
    center: { lat: -36.6939, lng: -56.6803 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('san-bernardo-centro', 'San Bernardo', -36.6939, -56.6803),
      z('mar-de-ajo', 'Mar de Ajó', -36.7222, -56.6706),
      z('costa-azul', 'Costa Azul', -36.6708, -56.6903),
      z('aguas-verdes', 'Aguas Verdes', -36.6444, -56.6944),
      z('la-lucila-del-mar', 'La Lucila del Mar', -36.6597, -56.6889),
    ],
  },
  {
    key: 'miramar',
    label: 'Miramar',
    short: 'MIR',
    province: 'Buenos Aires',
    center: { lat: -38.2667, lng: -57.8394 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('miramar-centro', 'Centro', -38.2667, -57.8394),
      z('vivero', 'Vivero Dunícola', -38.2792, -57.8181),
      z('mir-norte', 'Barrio Norte', -38.2547, -57.8494),
      z('mar-del-sud', 'Mar del Sud', -38.3417, -57.9833),
    ],
  },
  {
    key: 'necochea',
    label: 'Necochea',
    short: 'NEC',
    province: 'Buenos Aires',
    center: { lat: -38.5545, lng: -58.7396 },
    radiusM: 13000,
    legalLimit: 40,
    zones: [
      z('nec-centro', 'Centro', -38.5545, -58.7396),
      z('la-virazon', 'La Virazón', -38.5806, -58.7333),
      z('quequen', 'Quequén', -38.5667, -58.7),
      z('parque-miguel-lillo', 'Parque Miguel Lillo', -38.5722, -58.75),
    ],
  },
  {
    key: 'villa_carlos_paz',
    label: 'Villa Carlos Paz',
    short: 'VCP',
    province: 'Córdoba',
    center: { lat: -31.4241, lng: -64.4978 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('vcp-centro', 'Centro', -31.4241, -64.4978),
      z('villa-del-lago', 'Villa del Lago', -31.4064, -64.4881),
      z('playas-de-oro', 'Playas de Oro', -31.4361, -64.4864),
      z('san-nicolas', 'San Nicolás', -31.4472, -64.5139),
      z('costa-azul', 'Costa Azul', -31.3917, -64.4778),
      z('cuesta-blanca', 'Cuesta Blanca', -31.4861, -64.5722),
    ],
  },
  {
    key: 'rio_cuarto',
    label: 'Río Cuarto',
    short: 'RC',
    province: 'Córdoba',
    center: { lat: -33.1307, lng: -64.3499 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('rc-centro', 'Centro', -33.1307, -64.3499),
      z('banda-norte', 'Banda Norte', -33.1114, -64.3319),
      z('alberdi', 'Alberdi', -33.1236, -64.3611),
      z('golf', 'Golf', -33.1042, -64.3639),
      z('las-ferias', 'Las Ferias', -33.1444, -64.3556),
    ],
  },
  {
    key: 'san_juan',
    label: 'San Juan',
    short: 'SJ',
    province: 'San Juan',
    center: { lat: -31.5375, lng: -68.5364 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('sj-centro', 'Centro', -31.5375, -68.5364),
      z('rivadavia', 'Rivadavia', -31.5333, -68.5833),
      z('santa-lucia', 'Santa Lucía', -31.5333, -68.5),
      z('rawson', 'Rawson', -31.5833, -68.5333),
      z('chimbas', 'Chimbas', -31.5, -68.5333),
      z('pocito', 'Pocito', -31.6333, -68.55),
    ],
  },
  {
    key: 'san_luis',
    label: 'San Luis',
    short: 'SL',
    province: 'San Luis',
    center: { lat: -33.3017, lng: -66.3378 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('sl-centro', 'Centro', -33.3017, -66.3378),
      z('sl-norte', 'Barrio Norte', -33.2833, -66.3306),
      z('juana-koslay', 'Juana Koslay', -33.2861, -66.2611),
      z('el-volcan', 'El Volcán', -33.245, -66.1836),
      z('la-punta', 'La Punta', -33.2028, -66.3167),
    ],
  },
  {
    key: 'san_rafael',
    label: 'San Rafael',
    short: 'SR',
    province: 'Mendoza',
    center: { lat: -34.6177, lng: -68.3301 },
    radiusM: 18000,
    legalLimit: 40,
    zones: [
      z('sr-centro', 'Centro', -34.6177, -68.3301),
      z('cuadro-nacional', 'Cuadro Nacional', -34.5806, -68.3667),
      z('valle-grande', 'Valle Grande', -34.7833, -68.4),
      z('las-paredes', 'Las Paredes', -34.5847, -68.4194),
      z('rama-caida', 'Rama Caída', -34.6694, -68.3778),
    ],
  },
  {
    key: 'jujuy',
    label: 'San Salvador de Jujuy',
    short: 'JUJ',
    province: 'Jujuy',
    center: { lat: -24.1858, lng: -65.2995 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('juj-centro', 'Centro', -24.1858, -65.2995),
      z('alto-comedero', 'Alto Comedero', -24.2528, -65.2694),
      z('ciudad-de-nieva', 'Ciudad de Nieva', -24.1889, -65.3214),
      z('los-perales', 'Los Perales', -24.1694, -65.2917),
      z('palpala', 'Palpalá', -24.2556, -65.2075),
      z('yala', 'Yala', -24.1194, -65.3833),
    ],
  },
  {
    key: 'catamarca',
    label: 'San Fernando del Valle de Catamarca',
    short: 'CAT',
    province: 'Catamarca',
    center: { lat: -28.4696, lng: -65.7852 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('cat-centro', 'Centro', -28.4696, -65.7852),
      z('valle-viejo', 'Valle Viejo', -28.4667, -65.7333),
      z('cat-norte', 'Barrio Norte', -28.4506, -65.7889),
      z('el-jumeal', 'El Jumeal', -28.4444, -65.7694),
      z('fray-mamerto-esquiu', 'Fray Mamerto Esquiú', -28.4083, -65.7556),
    ],
  },
  {
    key: 'la_rioja',
    label: 'La Rioja',
    short: 'LR',
    province: 'La Rioja',
    center: { lat: -29.4131, lng: -66.8558 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('lr-centro', 'Centro', -29.4131, -66.8558),
      z('vargas', 'Vargas', -29.3944, -66.8444),
      z('joaquin-v-gonzalez', 'Joaquín V. González', -29.4306, -66.8722),
      z('las-lomas', 'Las Lomas', -29.3861, -66.8722),
      z('el-faldeo', 'El Faldeo', -29.3722, -66.8917),
    ],
  },
  {
    key: 'santiago_del_estero',
    label: 'Santiago del Estero',
    short: 'SDE',
    province: 'Santiago del Estero',
    center: { lat: -27.7951, lng: -64.2615 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('sde-centro', 'Centro', -27.7951, -64.2615),
      z('la-banda', 'La Banda', -27.7333, -64.2417),
      z('sde-norte', 'Barrio Norte', -27.7778, -64.2583),
      z('parque-aguirre', 'Parque Aguirre', -27.7833, -64.2528),
      z('autonomia', 'Autonomía', -27.8083, -64.2694),
    ],
  },
  {
    key: 'formosa',
    label: 'Formosa',
    short: 'FSA',
    province: 'Formosa',
    center: { lat: -26.1849, lng: -58.1731 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('fsa-centro', 'Centro', -26.1849, -58.1731),
      z('costanera', 'Costanera', -26.1764, -58.1656),
      z('san-miguel', 'San Miguel', -26.1972, -58.1917),
      z('villa-hermosa', 'Villa Hermosa', -26.2083, -58.2028),
    ],
  },
  {
    key: 'rio_gallegos',
    label: 'Río Gallegos',
    short: 'RGL',
    province: 'Santa Cruz',
    center: { lat: -51.6226, lng: -69.2181 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('rgl-centro', 'Centro', -51.6226, -69.2181),
      z('rgl-sur', 'Zona Sur', -51.6389, -69.2306),
      z('san-benito', 'San Benito', -51.6083, -69.2444),
      z('gregores', 'Gregores', -51.6139, -69.2028),
    ],
  },
  {
    key: 'comodoro_rivadavia',
    label: 'Comodoro Rivadavia',
    short: 'CRD',
    province: 'Chubut',
    center: { lat: -45.8641, lng: -67.4966 },
    radiusM: 18000,
    legalLimit: 40,
    zones: [
      z('crd-centro', 'Centro', -45.8641, -67.4966),
      z('rada-tilly', 'Rada Tilly', -45.9333, -67.5528),
      z('km-3', 'Km 3', -45.8347, -67.4778),
      z('km-8', 'Km 8', -45.7917, -67.4583),
      z('general-mosconi', 'General Mosconi', -45.7889, -67.4694),
    ],
  },
  {
    key: 'puerto_madryn',
    label: 'Puerto Madryn',
    short: 'PMY',
    province: 'Chubut',
    center: { lat: -42.7692, lng: -65.0385 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('pmy-centro', 'Centro', -42.7692, -65.0385),
      z('pmy-norte', 'Zona Norte', -42.7472, -65.0139),
      z('punta-cuevas', 'Punta Cuevas', -42.7889, -65.0139),
      z('el-doradillo', 'El Doradillo', -42.6667, -64.9833),
      z('pmy-sur', 'Zona Sur', -42.7889, -65.0528),
    ],
  },
  {
    key: 'trelew',
    label: 'Trelew',
    short: 'REL',
    province: 'Chubut',
    center: { lat: -43.2489, lng: -65.3051 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('rel-centro', 'Centro', -43.2489, -65.3051),
      z('rel-norte', 'Barrio Norte', -43.2333, -65.3),
      z('rawson', 'Rawson', -43.3, -65.1),
      z('gaiman', 'Gaiman', -43.2894, -65.4922),
    ],
  },
  {
    key: 'ushuaia',
    label: 'Ushuaia',
    short: 'USH',
    province: 'Tierra del Fuego',
    center: { lat: -54.8019, lng: -68.303 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('ush-centro', 'Centro', -54.8019, -68.303),
      z('bahia-encerrada', 'Bahía Encerrada', -54.8036, -68.3167),
      z('andorra', 'Andorra', -54.7683, -68.3417),
      z('rio-pipo', 'Río Pipo', -54.7833, -68.3667),
      z('cerro-castor', 'Cerro Castor', -54.7333, -68.0167),
      z('bahia-golondrina', 'Bahía Golondrina', -54.8167, -68.35),
    ],
  },
  {
    key: 'el_bolson',
    label: 'El Bolsón',
    short: 'EBO',
    province: 'Río Negro',
    center: { lat: -41.9686, lng: -71.534 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('ebo-centro', 'Centro', -41.9686, -71.534),
      z('lago-puelo', 'Lago Puelo', -42.0806, -71.6),
      z('mallin-ahogado', 'Mallín Ahogado', -41.9111, -71.5389),
      z('cerro-piltriquitron', 'Piltriquitrón', -41.9694, -71.4833),
      z('villa-turismo', 'Villa Turismo', -41.9806, -71.5194),
    ],
  },
  {
    key: 'san_martin_de_los_andes',
    label: 'San Martín de los Andes',
    short: 'SMA',
    province: 'Neuquén',
    center: { lat: -40.1579, lng: -71.3529 },
    radiusM: 16000,
    legalLimit: 40,
    zones: [
      z('sma-centro', 'Centro', -40.1579, -71.3529),
      z('chapelco', 'Chapelco', -40.2278, -71.2944),
      z('costanera', 'Costanera', -40.1639, -71.3556),
      z('vega-maipu', 'Vega Maipú', -40.1444, -71.3389),
      z('quila-quina', 'Quila Quina', -40.1861, -71.4306),
    ],
  },
  {
    key: 'villa_la_angostura',
    label: 'Villa La Angostura',
    short: 'VLA',
    province: 'Neuquén',
    center: { lat: -40.757, lng: -71.6486 },
    radiusM: 15000,
    legalLimit: 40,
    zones: [
      z('vla-centro', 'Centro', -40.757, -71.6486),
      z('puerto-manzano', 'Puerto Manzano', -40.7333, -71.6),
      z('bahia-brava', 'Bahía Brava', -40.7639, -71.6667),
      z('cerro-bayo', 'Cerro Bayo', -40.7444, -71.5722),
      z('la-villa', 'La Villa', -40.7806, -71.6528),
    ],
  },
  {
    key: 'esquel',
    label: 'Esquel',
    short: 'EQS',
    province: 'Chubut',
    center: { lat: -42.9092, lng: -71.3151 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('eqs-centro', 'Centro', -42.9092, -71.3151),
      z('la-hoya', 'La Hoya', -42.8333, -71.3),
      z('trevelin', 'Trevelin', -43.0833, -71.4667),
      z('baden', 'Badén', -42.9222, -71.3306),
    ],
  },
  {
    key: 'viedma',
    label: 'Viedma',
    short: 'VDM',
    province: 'Río Negro',
    center: { lat: -40.8135, lng: -62.9967 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('vdm-centro', 'Centro', -40.8135, -62.9967),
      z('carmen-de-patagones', 'Carmen de Patagones', -40.7994, -62.9836),
      z('el-condor', 'El Cóndor', -41.0472, -62.8236),
      z('costanera', 'Costanera', -40.8083, -62.9917),
    ],
  },
  {
    key: 'concordia',
    label: 'Concordia',
    short: 'CDA',
    province: 'Entre Ríos',
    center: { lat: -31.3929, lng: -58.0209 },
    radiusM: 14000,
    legalLimit: 40,
    zones: [
      z('cda-centro', 'Centro', -31.3929, -58.0209),
      z('costanera', 'Costanera', -31.3861, -58.0056),
      z('villa-zorraquin', 'Villa Zorraquín', -31.3472, -58.0139),
      z('las-termas', 'Las Termas', -31.3306, -58.0333),
    ],
  },
  {
    key: 'gualeguaychu',
    label: 'Gualeguaychú',
    short: 'GCH',
    province: 'Entre Ríos',
    center: { lat: -33.0092, lng: -58.5172 },
    radiusM: 13000,
    legalLimit: 40,
    zones: [
      z('gch-centro', 'Centro', -33.0092, -58.5172),
      z('costanera', 'Costanera', -33.0056, -58.5083),
      z('corsodromo', 'Corsódromo', -32.9917, -58.5139),
      z('nandubaysal', 'Ñandubaysal', -33.0667, -58.4139),
    ],
  },
  {
    key: 'rafaela',
    label: 'Rafaela',
    short: 'RAF',
    province: 'Santa Fe',
    center: { lat: -31.2503, lng: -61.4867 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('raf-centro', 'Centro', -31.2503, -61.4867),
      z('barranquitas', 'Barranquitas', -31.2361, -61.4972),
      z('villa-rosas', 'Villa Rosas', -31.2639, -61.4778),
      z('parque-balneario', 'Parque Balneario', -31.2417, -61.5028),
    ],
  },
  {
    key: 'san_nicolas',
    label: 'San Nicolás de los Arroyos',
    short: 'SNS',
    province: 'Buenos Aires',
    center: { lat: -33.3358, lng: -60.2119 },
    radiusM: 13000,
    legalLimit: 40,
    zones: [
      z('sns-centro', 'Centro', -33.3358, -60.2119),
      z('costanera', 'Costanera', -33.3306, -60.2028),
      z('sns-norte', 'Barrio Norte', -33.3167, -60.2222),
      z('somisa', 'Somisa', -33.3611, -60.1833),
    ],
  },
  {
    key: 'junin',
    label: 'Junín',
    short: 'JUN',
    province: 'Buenos Aires',
    center: { lat: -34.5836, lng: -60.9464 },
    radiusM: 12000,
    legalLimit: 40,
    zones: [
      z('jun-centro', 'Centro', -34.5836, -60.9464),
      z('laguna-de-gomez', 'Laguna de Gómez', -34.6667, -61.0333),
      z('villa-belgrano', 'Villa Belgrano', -34.5694, -60.9583),
      z('barrio-sur', 'Barrio Sur', -34.5972, -60.9417),
    ],
  },
];

const BY_KEY = new Map(CITIES.map((c) => [c.key, c]))

/** Ciudad que ve alguien que todavía no eligió ninguna. */
export const DEFAULT_CITY: City = 'la_plata'

export function findCity(key: City): CityDef | undefined {
  return BY_KEY.get(key)
}

export function getCity(key: City): CityDef {
  const found = BY_KEY.get(key)
  if (found) return found
  // Antes cualquier clave desconocida caía en silencio a La Plata. Con tres
  // ciudades eso era inocuo; con el país entero significa mandar a alguien a
  // mil kilómetros del lugar equivocado sin decirle nada. Ahora el nombre
  // degrada a la clave cruda — se nota que algo está mal en vez de mentir.
  // En la práctica es inalcanzable: `parties.city` tiene FK contra `cities`,
  // que se siembra desde este mismo catálogo.
  const fallback = BY_KEY.get(DEFAULT_CITY) ?? CITIES[0]
  return { ...fallback, key, label: key, short: key.slice(0, 3).toUpperCase(), zones: [] }
}

export function getZone(cityKey: City, zoneKey: string): Zone | undefined {
  return getCity(cityKey).zones.find((z) => z.key === zoneKey)
}

export function zoneLabel(cityKey: City, zoneKey: string): string {
  return getZone(cityKey, zoneKey)?.label ?? zoneKey
}

/** Sin acentos y en minúscula, para que "cordoba" encuentre "Córdoba". */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Buscador del selector de ciudad. Con sesenta ciudades la tira horizontal de
 * chips dejó de servir: hace falta escribir. Busca por nombre y por provincia,
 * así "neuquen" encuentra tanto la capital como San Martín de los Andes.
 */
export function searchCities(query: string, limit = 40): CityDef[] {
  const q = fold(query)
  if (!q) return CITIES.slice(0, limit)
  const scored: Array<{ c: CityDef; score: number }> = []
  for (const c of CITIES) {
    const label = fold(c.label)
    const province = fold(c.province)
    let score = -1
    if (label.startsWith(q)) score = 0
    else if (label.includes(q)) score = 1
    else if (province.startsWith(q)) score = 2
    else if (province.includes(q)) score = 3
    else if (c.zones.some((z) => fold(z.label).includes(q))) score = 4
    if (score >= 0) scored.push({ c, score })
  }
  scored.sort((a, b) => a.score - b.score || a.c.label.localeCompare(b.c.label, 'es'))
  return scored.slice(0, limit).map((s) => s.c)
}

/** La ciudad del catálogo más cercana a un punto, si cae dentro de su radio. */
export function cityAt(lat: number, lng: number): CityDef | undefined {
  let best: CityDef | undefined
  let bestD = Infinity
  for (const c of CITIES) {
    const dLat = ((lat - c.center.lat) * Math.PI) / 180
    const dLng = ((lng - c.center.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((c.center.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const d = 6371000 * 2 * Math.asin(Math.sqrt(a))
    if (d < c.radiusM && d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

/**
 * La zona de una ciudad más cercana a un punto. Se usa al soltar el pin: con
 * el mapa libre, el barrio elegido en el desplegable y el punto real pueden
 * quedar en puntas opuestas de la ciudad, y la zona es lo que después decide
 * en qué pin del mapa aparece la previa.
 */
export function nearestZone(cityKey: City, lat: number, lng: number): Zone | undefined {
  const city = findCity(cityKey)
  if (!city) return undefined
  let best: Zone | undefined
  let bestD = Infinity
  for (const zone of city.zones) {
    const dLat = ((lat - zone.lat) * Math.PI) / 180
    const dLng = ((lng - zone.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((zone.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const d = 6371000 * 2 * Math.asin(Math.sqrt(a))
    if (d < bestD) {
      bestD = d
      best = zone
    }
  }
  return best
}
