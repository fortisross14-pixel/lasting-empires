import type { Personality } from '../types';

interface HistRuler { name: string; traits: string[]; from: number; to: number; }

export interface NationDef {
  id: string; name: string; adj: string; color: string; culture: string; religion: string; capital: string; native?: boolean;
  personality: Personality; gold: number; playable?: boolean; blurb?: string;
  army: string[];  // starting troop types
}

// id;Name;Adjective;colour;culture;religion;capital;personality;gold;army
// army: S small, M medium, L large, X great power, H horse people, N tribal, E native empire
const NATION_TABLE = `
granada;Granada;Granadine;#6f9134;andalusi;muslim;granada;cautious;40;levy,levy,crossbow,jinetes,jinetes
navarre;Navarre;Navarrese;#b4653c;basque;catholic;pamplona;cautious;25;levy,crossbow
france;France;French;#3d5ca3;french;catholic;paris;expansionist;90;X
brittany;Brittany;Breton;#7f8fa6;breton;catholic;rennes;cautious;25;S
burgundy;Burgundy;Burgundian;#8a3f63;burgundian;catholic;dijon;expansionist;80;L
england;England;English;#c0392b;english;catholic;london;expansionist;80;L
scotland;Scotland;Scottish;#2f4f8f;scottish;catholic;edinburgh;balanced;30;M
ireland;Ireland;Irish;#3f8f4f;irish;catholic;galway;cautious;15;S
denmark;Denmark;Danish;#b03a48;danish;catholic;copenhagen;balanced;50;L
sweden;Sweden;Swedish;#2c6fb0;swedish;catholic;stockholm;expansionist;35;M
hansa;Hanseatic League;Hanseatic;#9c8a5a;german;catholic;lubeck;merchant;80;S
cologne;Cologne;Colognian;#d9d0c1;german;catholic;cologne;cautious;30;S
palatinate;Palatinate;Palatine;#6a8a3c;german;catholic;heidelberg;cautious;30;S
hesse;Hesse;Hessian;#5e7c99;german;catholic;kassel;cautious;25;S
wurttemberg;Württemberg;Württemberger;#c49b3a;german;catholic;stuttgart;cautious;25;S
brunswick;Brunswick;Brunswicker;#9a6a3a;german;catholic;luneburg;cautious;25;S
brandenburg;Brandenburg;Brandenburger;#5a6070;german;catholic;berlin;expansionist;30;M
saxony;Saxony;Saxon;#3f8a6f;german;catholic;dresden;balanced;40;M
bavaria;Bavaria;Bavarian;#5b9bd5;german;catholic;munich;balanced;40;M
austria;Austria;Austrian;#e8e2d0;austrian;catholic;vienna;expansionist;60;L
swiss;Swiss Confederacy;Swiss;#b7322c;swiss;catholic;bern;cautious;30;swiss,levy,crossbow
bohemia;Bohemia;Bohemian;#c9a227;czech;catholic;prague;balanced;45;M
savoy;Savoy;Savoyard;#9b7bb8;italian;catholic;turin;cautious;25;levy,men_at_arms
milan;Milan;Milanese;#4e95b5;italian;catholic;milan;expansionist;50;levy,crossbow,men_at_arms,knights
genoa;Genoa;Genoese;#a9b4bb;italian;catholic;genoa;merchant;50;levy,crossbow,crossbow
venice;Venice;Venetian;#c8603e;italian;catholic;venice;merchant;80;levy,crossbow,crossbow,men_at_arms,bombard
florence;Florence;Florentine;#a6487f;italian;catholic;florence;merchant;60;levy,crossbow,men_at_arms
papacy;Papal States;Papal;#e3d6a4;italian;catholic;rome;cautious;60;levy,levy,men_at_arms
naples;Naples;Neapolitan;#7c55a8;italian;catholic;naples;balanced;50;levy,levy,crossbow,men_at_arms,knights
poland;Poland;Polish;#d4566a;polish;catholic;krakow;balanced;50;L
lithuania;Lithuania;Lithuanian;#8fae4a;lithuanian;catholic;vilnius;expansionist;40;L
teutonic;Teutonic Order;Teutonic;#4a4a4a;german;catholic;konigsberg;zealot;35;knights,men_at_arms,crossbow
hungary;Hungary;Hungarian;#6f6f96;hungarian;catholic;buda;balanced;50;L
muscovy;Muscovy;Muscovite;#4f8b3e;russian;orthodox;moscow;expansionist;40;L
novgorod;Novgorod;Novgorodian;#8a6f3e;russian;orthodox;novgorod;merchant;50;M
kazan;Kazan;Kazani;#5e8f8f;tatar;muslim;kazan;cautious;25;H
horde;Great Horde;Horde;#a07a40;tatar;muslim;astrakhan;expansionist;20;H
crimea;Crimea;Crimean;#7aa65a;tatar;muslim;crimea;expansionist;30;H
moldavia;Moldavia;Moldavian;#b88a3a;romanian;orthodox;suceava;cautious;20;S
wallachia;Wallachia;Wallachian;#9c4a3a;romanian;orthodox;tirgoviste;cautious;20;S
bosnia;Bosnia;Bosnian;#6a7fa0;serbian;catholic;bosnia;cautious;15;S
serbia;Serbia;Serbian;#a35a5a;serbian;orthodox;belgrade;cautious;20;S
albania;Albania;Albanian;#7a2f2f;albanian;catholic;kruja;cautious;15;S
byzantium;Byzantium;Byzantine;#8e44ad;greek;orthodox;constantinople;cautious;30;levy,levy,crossbow,men_at_arms
ottomans;Ottoman Empire;Ottoman;#3c8f5a;turkish;muslim;edirne;expansionist;90;levy,levy,levy,crossbow,crossbow,men_at_arms,jinetes,jinetes,bombard
karaman;Karaman;Karamanid;#b5895a;turkish;muslim;konya;balanced;30;H
trebizond;Trebizond;Trapezuntine;#c070a0;greek;orthodox;trebizond;cautious;15;S
georgia;Georgia;Georgian;#c05050;georgian;orthodox;tbilisi;cautious;20;S
cyprus;Cyprus;Cypriot;#d8b04a;greek;catholic;cyprus;merchant;25;S
mamluks;Mamluk Sultanate;Mamluk;#d0a040;arab;muslim;cairo;balanced;90;levy,levy,crossbow,jinetes,jinetes,knights,knights
aqqoyunlu;Aq Qoyunlu;Aq Qoyunlu;#d8d0b0;turkish;muslim;diyarbakir;expansionist;30;H
qaraqoyunlu;Qara Qoyunlu;Qara Qoyunlu;#3a3a5a;persian;muslim;tabriz;balanced;40;H
timurids;Timurids;Timurid;#4a90a0;persian;muslim;herat;balanced;50;H
uzbeks;Uzbeks;Uzbek;#a0b060;uzbek;muslim;kazakh;expansionist;20;H
hormuz;Hormuz;Hormuzi;#60a0c0;persian;muslim;hormuz;merchant;40;S
oman;Oman;Omani;#a04040;arab;muslim;muscat;merchant;30;S
yemen;Yemen;Yemeni;#80a050;arab;muslim;yemen;cautious;20;S
bedouins;Bedouin Tribes;Bedouin;#c8b080;arab;muslim;najd;cautious;10;N
morocco;Morocco;Moroccan;#8f5232;maghrebi;muslim;fez;zealot;40;levy,levy,jinetes,jinetes
tlemcen;Tlemcen;Zayyanid;#bf9354;maghrebi;muslim;tlemcen;cautious;30;levy,jinetes,crossbow
tunis;Tunis;Hafsid;#5f8566;maghrebi;muslim;tunis;balanced;50;levy,levy,crossbow,jinetes
tribes;Saharan Tribes;Tribal;#b8a07a;berber;muslim;fezzan;cautious;10;N
jolof;Jolof;Wolof;#9a7a3a;wolof;animist;jolof;cautious;15;N
mali;Mali;Malian;#c8962a;manding;muslim;niani;balanced;50;M
songhai;Songhai;Songhai;#b0502a;songhai;muslim;gao;expansionist;40;M
benin;Benin;Edo;#8a3a2a;edo;animist;benin;cautious;30;N
hausa;Hausa States;Hausa;#a0803a;hausa;muslim;kano;merchant;30;S
bornu;Bornu;Kanuri;#7a6a3a;kanuri;muslim;bornu;balanced;25;S
kongo;Kongo;Kongolese;#5a8a3a;bantu;animist;kongo;cautious;25;N
mutapa;Mutapa;Shona;#8a6a2a;bantu;animist;mutapa;cautious;30;N
kilwa;Kilwa;Swahili;#3a8a8a;swahili;muslim;kilwa;merchant;40;S
ethiopia;Ethiopia;Ethiopian;#4a7a2a;amhara;coptic;amhara;zealot;35;M
adal;Adal;Adali;#a0703a;somali;muslim;harar;zealot;20;H
delhi;Delhi;Delhite;#2a8a4a;hindustani;muslim;delhi;expansionist;70;L
jaunpur;Jaunpur;Jaunpuri;#6aa07a;hindustani;muslim;jaunpur;balanced;40;M
bengal;Bengal;Bengali;#3a7a6a;bengali;muslim;gaur;merchant;60;M
gujarat;Gujarat;Gujarati;#c07a3a;gujarati;muslim;ahmedabad;merchant;60;M
malwa;Malwa;Malwi;#a05a7a;hindustani;muslim;mandu;balanced;30;S
mewar;Mewar;Rajput;#d0703a;rajput;hindu;chittor;zealot;30;M
sindh;Sindh;Sindhi;#7a9a5a;sindhi;muslim;thatta;cautious;25;S
kashmir;Kashmir;Kashmiri;#9a7ab0;kashmiri;muslim;srinagar;cautious;20;S
bahmani;Bahmani;Deccani;#3a5a8a;deccani;muslim;bidar;expansionist;50;L
vijayanagara;Vijayanagara;Vijayanagari;#c0402a;kannada;hindu;hampi;expansionist;70;L
calicut;Calicut;Malayali;#d8a03a;malayali;hindu;calicut;merchant;50;S
orissa;Orissa;Oriya;#a0a03a;oriya;hindu;cuttack;cautious;30;M
kotte;Kotte;Sinhalese;#5aa0a0;sinhala;buddhist;kotte;merchant;25;S
ming;Ming;Chinese;#d8c03a;han;confucian;beijing;cautious;200;levy,levy,levy,levy,crossbow,crossbow,crossbow,men_at_arms,men_at_arms,jinetes,bombard
jurchens;Jurchens;Jurchen;#6a8ab0;jurchen;animist;liaodong;expansionist;15;H
mongols;Mongols;Mongol;#8a8a5a;mongol;buddhist;karakorum;expansionist;15;H
tibet;Tibet;Tibetan;#c0a0d0;tibetan;buddhist;lhasa;cautious;20;S
korea;Korea;Korean;#6a6ab0;korean;confucian;hanseong;cautious;50;M
japan;Ashikaga Shogunate;Japanese;#c03a3a;japanese;shinto;kyoto;balanced;40;M
daiviet;Dai Viet;Vietnamese;#a03a5a;viet;confucian;hanoi;expansionist;40;M
champa;Champa;Cham;#7aa0a0;cham;hindu;champa;cautious;20;S
khmer;Khmer;Khmer;#c08a5a;khmer;buddhist;angkor;cautious;25;S
ayutthaya;Ayutthaya;Siamese;#d0a0a0;thai;buddhist;ayutthaya;balanced;40;M
ava;Ava;Burmese;#a08a3a;burmese;buddhist;ava;balanced;30;M
malacca;Malacca;Malaccan;#3aa06a;malay;muslim;malacca;merchant;50;S
majapahit;Majapahit;Javanese;#c06a3a;javanese;hindu;java;balanced;40;M
brunei;Brunei;Bruneian;#d8d03a;malay;muslim;brunei;merchant;30;S
ternate;Ternate;Ternatan;#5a3a8a;moluccan;muslim;ternate;merchant;30;S
aztec;Aztec Empire;Mexica;#2aa0a0;nahua;nahuatl;tenochtitlan;expansionist;80;E
tarascan;Tarascan State;Purépecha;#a0c03a;purepecha;nahuatl;michoacan;cautious;30;N
maya;Maya Cities;Maya;#3a8a6a;maya;nahuatl;yucatan;cautious;30;N
inca;Inca Empire;Inca;#d8b02a;quechua;inti;cusco;expansionist;80;E
chimor;Chimor;Chimú;#a06a5a;chimu;inti;chanchan;cautious;25;N
mossi;Mossi States;Mossi;#b06a4a;mossi;animist;ouagadougou;expansionist;20;levy,levy,jinetes,jinetes
oyo;Oyo;Oyo;#c4a24a;yoruba;animist;oyo;expansionist;25;levy,levy,levy,jinetes
ajuran;Ajuran;Ajuran;#4a8ab0;somali;muslim;mogadishu;merchant;30;S
tlaxcala;Tlaxcala;Tlaxcaltec;#b04a4a;nahua;nahuatl;tlaxcala;cautious;20;N
mixtec;Mixtec Kingdoms;Mixtec;#7a4ab0;mixtec;nahuatl;mixteca;cautious;25;N
muisca;Muisca Confederation;Muisca;#4ab07a;muisca;animist;muisca;cautious;30;N
tver;Tver;Tverian;#8ab0d0;russian;orthodox;tver;cautious;25;M
moghulistan;Moghulistan;Moghul;#9a5a8a;chagatai;muslim;ili;expansionist;20;H
hosokawa;Hosokawa;Hosokawa;#e07a5a;japanese;shinto;settsu;merchant;45;M
ouchi;Ōuchi;Ōuchi;#7a3a8a;japanese;shinto;suo;merchant;45;M
yamana;Yamana;Yamana;#b8742a;japanese;shinto;tajima;expansionist;40;M
hatakeyama;Hatakeyama;Hatakeyama;#c05a8a;japanese;shinto;kawachi;balanced;30;S
shiba;Shiba;Shiba;#9ab04a;japanese;shinto;echizen;cautious;30;S
uesugi;Uesugi;Uesugi;#3a5a9a;japanese;shinto;edo;balanced;35;M
takeda;Takeda;Takeda;#8a1f1f;japanese;shinto;kai;expansionist;25;S
imagawa;Imagawa;Imagawa;#d8a84a;japanese;shinto;suruga;balanced;25;S
date;Date;Date;#4a4a6a;japanese;shinto;mutsu;expansionist;20;S
otomo;Ōtomo;Ōtomo;#6aa0d0;japanese;shinto;bungo;balanced;30;S
shimazu;Shimazu;Shimazu;#2f6f5f;japanese;shinto;satsuma;expansionist;30;S
ryukyu;Ryukyu;Ryukyuan;#3ab0b0;ryukyuan;buddhist;ryukyu;merchant;40;S
oirats;Oirats;Oirat;#b89a6a;oirat;buddhist;khovd;expansionist;30;levy,jinetes,jinetes,jinetes,jinetes,jinetes
lanna;Lan Na;Lanna;#b07aa0;thai;buddhist;chiangmai;balanced;25;S
lanxang;Lan Xang;Lao;#6aa05a;lao;buddhist;luangprabang;cautious;25;S
hanthawaddy;Hanthawaddy;Mon;#4a8a9a;mon;buddhist;pegu;merchant;35;S
arakan;Arakan;Arakanese;#9a6a4a;rakhine;buddhist;mraukoo;cautious;20;S
pasai;Samudera Pasai;Pasai;#2f7f4f;malay;muslim;pasai;merchant;25;S
sunda;Sunda;Sundanese;#a0a03a;sundanese;hindu;sunda;cautious;25;S
tidore;Tidore;Tidorese;#a07ac0;moluccan;muslim;tidore;merchant;20;S
sulu;Sulu;Tausug;#4a7aa0;filipino;muslim;sulu;merchant;20;S
candar;Candar;Candarid;#7a6aa8;turkish;muslim;kastamonu;cautious;20;S
dulkadir;Dulkadir;Dulkadirid;#5f9fa8;turkish;muslim;elbistan;balanced;20;H
ramadanids;Ramadanids;Ramadanid;#a85a4a;turkish;muslim;adana;cautious;20;H
hospitallers;Knights Hospitaller;Hospitaller;#9a2a3a;french;catholic;rhodes;zealot;40;knights,knights,men_at_arms,crossbow
shirvan;Shirvan;Shirvani;#5aa7a0;azeri;muslim;shamakhi;merchant;40;M
circassia;Circassia;Circassian;#a8784e;circassian;orthodox;circassia;cautious;10;N
dagestan;Shamkhalate;Dagestani;#6a7a4a;dagestani;muslim;dagestan;cautious;10;N
kurds;Kurdish Emirates;Kurdish;#6a9a6a;kurdish;muslim;bitlis;cautious;15;H
gilan;Gilan;Gilaki;#8ab050;persian;muslim;gilan;cautious;20;S
hadramawt;Hadramawt;Hadrami;#7a5aa0;arab;muslim;hadramawt;merchant;20;S
natives;Native peoples;native;#e6dfcc;native;animist;cape;cautious;0;N
`;

const ARMIES: Record<string, string[]> = {
  S: ['levy', 'levy', 'crossbow'],
  M: ['levy', 'levy', 'crossbow', 'men_at_arms'],
  L: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms', 'knights'],
  X: ['levy', 'levy', 'levy', 'crossbow', 'crossbow', 'men_at_arms', 'men_at_arms', 'knights', 'bombard'],
  H: ['levy', 'jinetes', 'jinetes', 'jinetes'],
  N: ['levy', 'levy', 'levy'],
  E: ['levy', 'levy', 'levy', 'levy', 'levy', 'men_at_arms'],
};

const PLAYABLE: NationDef[] = [
  { id: 'castile', name: 'Castile', adj: 'Castilian', color: '#a23b4c', culture: 'castilian', religion: 'catholic', capital: 'toledo', personality: 'expansionist', gold: 70, playable: true,
    blurb: 'The largest crown of Iberia. Rich in land and men, troubled at court. Granada lies to the south.',
    army: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms', 'jinetes'] },
  { id: 'portugal', name: 'Portugal', adj: 'Portuguese', color: '#2e8577', culture: 'portuguese', religion: 'catholic', capital: 'lisbon', personality: 'merchant', gold: 80, playable: true,
    blurb: 'A small kingdom facing the open ocean. Few soldiers, many ships, and the whole Atlantic ahead.',
    army: ['levy', 'levy', 'levy', 'crossbow', 'men_at_arms'] },
  { id: 'aragon', name: 'Aragon', adj: 'Aragonese', color: '#d1a032', culture: 'aragonese', religion: 'catholic', capital: 'zaragoza', personality: 'balanced', gold: 70, playable: true,
    blurb: 'A crown of many parts: Catalan merchants, island kingdoms, and ambitions in Italy.',
    army: ['levy', 'levy', 'crossbow', 'crossbow', 'men_at_arms'] },
];

export const NATIONS: NationDef[] = [
  ...PLAYABLE,
  ...NATION_TABLE.trim().split('\n').map(line => {
    const [id, name, adj, color, culture, religion, capital, personality, gold, army] = line.split(';');
    return { id, name, adj, color, culture, religion, capital, personality: personality as Personality, gold: +gold, army: ARMIES[army] ?? army.split(','), native: id === 'natives' || undefined };
  }),
];

/** Lands without a state: they never act, and are taken by colonising. */
export const NO_STATE = 'natives';

// Starting relations (symmetric). Unlisted pairs start at 0.
export const START_REL: [string, string, number][] = [
  ['castile', 'granada', -60], ['castile', 'aragon', 20], ['castile', 'portugal', 0], ['castile', 'navarre', 10],
  ['castile', 'france', 10], ['aragon', 'naples', 40], ['aragon', 'france', -30], ['aragon', 'genoa', -40],
  ['aragon', 'tunis', -30], ['aragon', 'granada', -30], ['portugal', 'morocco', -50], ['portugal', 'granada', -20],
  ['granada', 'morocco', 30], ['navarre', 'france', 20], ['venice', 'milan', -30], ['venice', 'hungary', -20],
  ['florence', 'milan', 20], ['papacy', 'naples', 10], ['france', 'milan', -10], ['france', 'savoy', 10],
  ['genoa', 'milan', 10], ['tunis', 'tlemcen', -10], ['morocco', 'tlemcen', -20], ['florence', 'venice', -10],
  ['papacy', 'castile', 15], ['papacy', 'aragon', 5], ['papacy', 'portugal', 15],
  ['france', 'england', -60], ['france', 'burgundy', -40], ['england', 'scotland', -50], ['france', 'scotland', 40],
  ['england', 'portugal', 40], ['burgundy', 'england', 20], ['ottomans', 'byzantium', -80], ['ottomans', 'venice', -30],
  ['ottomans', 'hungary', -50], ['ottomans', 'karaman', -40], ['ottomans', 'mamluks', -10], ['poland', 'lithuania', 60],
  ['poland', 'teutonic', -60], ['lithuania', 'muscovy', -40], ['muscovy', 'novgorod', -30], ['muscovy', 'kazan', -40],
  ['denmark', 'sweden', -40], ['denmark', 'hansa', -20], ['austria', 'hungary', -10], ['austria', 'bohemia', 10],
  ['aqqoyunlu', 'qaraqoyunlu', -60], ['timurids', 'uzbeks', -40], ['ming', 'mongols', -50], ['ming', 'korea', 40],
  ['delhi', 'jaunpur', -40], ['bahmani', 'vijayanagara', -60], ['aztec', 'tarascan', -60], ['ethiopia', 'adal', -60],
  ['castile', 'england', 10], ['aragon', 'venice', -10], ['portugal', 'castile', -10],
];

// Historical rulers for the playable nations. After the list runs out, rulers are generated.
export const RULERS: Record<string, HistRuler[]> = {
  castile: [
    { name: 'Juan II', traits: ['Weak'], from: 1406, to: 1454 },
    { name: 'Enrique IV', traits: ['Weak', 'Generous'], from: 1454, to: 1474 },
    { name: 'Isabel I', traits: ['Pious', 'Able'], from: 1474, to: 1504 },
    { name: 'Juana I', traits: ['Unstable'], from: 1504, to: 1516 },
    { name: 'Carlos I', traits: ['Warrior', 'Ambitious'], from: 1516, to: 1556 },
    { name: 'Felipe II', traits: ['Diligent', 'Pious'], from: 1556, to: 1598 },
    { name: 'Felipe III', traits: ['Idle'], from: 1598, to: 1621 },
    { name: 'Felipe IV', traits: ['Patron'], from: 1621, to: 1665 },
    { name: 'Carlos II', traits: ['Sickly'], from: 1665, to: 1700 },
    { name: 'Felipe V', traits: ['Reformer'], from: 1700, to: 1746 },
    { name: 'Fernando VI', traits: ['Diligent'], from: 1746, to: 1759 },
  ],
  portugal: [
    { name: 'Afonso V', traits: ['Warrior'], from: 1438, to: 1481 },
    { name: 'João II', traits: ['Able', 'Ruthless'], from: 1481, to: 1495 },
    { name: 'Manuel I', traits: ['Fortunate'], from: 1495, to: 1521 },
    { name: 'João III', traits: ['Pious'], from: 1521, to: 1557 },
    { name: 'Sebastião', traits: ['Reckless'], from: 1557, to: 1578 },
    { name: 'Henrique', traits: ['Sickly', 'Pious'], from: 1578, to: 1580 },
  ],
  aragon: [
    { name: 'Alfonso V', traits: ['Magnanimous', 'Patron'], from: 1416, to: 1458 },
    { name: 'Juan II', traits: ['Warrior'], from: 1458, to: 1479 },
    { name: 'Fernando II', traits: ['Cunning', 'Able'], from: 1479, to: 1516 },
  ],
};

type Rates = Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research', number>>;

export interface RulerArch {
  id: string; name: string; desc: string; rates: Rates; all?: number; startCards?: number;
  role?: 'general' | 'diplomat' | 'admin' | 'merchant' | 'researcher';
  battle?: number; diplo?: number; research?: number; goldPct?: number; np?: number; stab?: number;
}

// What kind of monarch sits on the throne. Chosen from three heirs at each succession.
export const RULER_ARCHS: Record<string, RulerArch> = {
  balanced: { id: 'balanced', name: 'Even-handed', desc: '+0.1 of every card type a year. 2 free cards at the coronation.', rates: {}, all: 0.1, startCards: 2 },
  martial:  { id: 'martial', name: 'Warrior', desc: '+0.5 Military cards a year, +10% battle strength. Can lead armies as a general.', rates: { military: 0.5 }, role: 'general', battle: 0.1 },
  merchant: { id: 'merchant', name: 'Merchant', desc: '+0.3 Economy cards a year, +10% income. Can act as a merchant.', rates: { economy: 0.3 }, role: 'merchant', goldPct: 0.1 },
  diplomat: { id: 'diplomat', name: 'Diplomat', desc: '+0.4 Diplomacy cards a year, +10% diplomatic success. Can go on embassies.', rates: { diplomacy: 0.4 }, role: 'diplomat', diplo: 0.1 },
  scholar:  { id: 'scholar', name: 'Scholar', desc: '+0.4 Research cards a year, +1 research on every study. Can study as a researcher.', rates: { research: 0.4 }, role: 'researcher', research: 1 },
  pious:    { id: 'pious', name: 'Pious', desc: '+0.4 Internal cards a year, +1 nation point a year, +1 stability on accession.', rates: { internal: 0.4 }, np: 1, stab: 1 },
  weak:     { id: 'weak', name: 'Feeble', desc: 'No talents. Favourites rule in the monarch\'s name. −1 stability on accession.', rates: {}, stab: -1 },
};

export function archFromTraits(traits: string[]): string {
  for (const t of traits) {
    if (['Warrior', 'Reckless', 'Ambitious', 'Ruthless'].includes(t)) return 'martial';
    if (t === 'Pious') return 'pious';
    if (['Cunning', 'Magnanimous'].includes(t)) return 'diplomat';
    if (t === 'Patron') return 'scholar';
    if (['Diligent', 'Fortunate', 'Reformer'].includes(t)) return 'merchant';
    if (t === 'Able') return 'balanced';
    if (['Weak', 'Idle', 'Unstable', 'Sickly'].includes(t)) return 'weak';
  }
  return 'balanced';
}

export const RULER_NAMES: Record<string, string[]> = {
  castilian: ['Alfonso', 'Fernando', 'Enrique', 'Juan', 'Pedro', 'Sancho', 'Carlos', 'Felipe', 'Isabel', 'Juana'],
  portuguese: ['Afonso', 'João', 'Duarte', 'Manuel', 'Pedro', 'Sebastião', 'Dinis', 'Maria'],
  aragonese: ['Jaume', 'Pere', 'Alfons', 'Joan', 'Martí', 'Ferran', 'Elionor'],
};
