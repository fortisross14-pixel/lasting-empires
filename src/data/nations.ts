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
byzantium;Byzantium;Byzantine;#8e44ad;greek;orthodox;constantinople;cautious;90;levy,levy,crossbow,men_at_arms,men_at_arms
ottomans;Ottoman Empire;Ottoman;#3c8f5a;turkish;muslim;edirne;expansionist;90;levy,levy,levy,levy,crossbow,crossbow,crossbow,men_at_arms,men_at_arms,men_at_arms,jinetes,jinetes,jinetes,bombard,bombard
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
pate;Pate;Pate;#2f9c8c;swahili;muslim;pate;merchant;20;S
ife;Ife;Ife;#d08a5a;yoruba;animist;ife;cautious;20;N
zapotec;Zapotec Kingdom;Zapotec;#c08a3a;zapotec;nahuatl;tehuantepec;cautious;25;N
multan;Multan;Multani;#8a6a3a;punjabi;muslim;multan;cautious;35;M
gwalior;Gwalior;Tomara;#9a3a5a;rajput;hindu;gwalior;cautious;30;M
nepal;Nepal;Nepali;#d06a9a;nepali;hindu;kathmandu;cautious;25;S
khandesh;Khandesh;Khandeshi;#5a8a9a;marathi;muslim;khandesh;cautious;20;S
badakhshan;Badakhshan;Badakhshani;#8a6fb5;persian;muslim;badakhshan;cautious;20;S
sistan;Sistan;Sistani;#c99a5b;persian;muslim;sistan;cautious;20;S
`;

export const ARMIES: Record<string, string[]> = {
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

const BLURBS: Record<string, string> = {
  byzantium: 'The last of Rome: one great city, the Morea, and the young Sultan already casting his guns. Very hard: you have two years before the siege.',
  ottomans: 'Mehmed II takes the throne in 1451. Constantinople lies before you, and Europe and Asia beyond it.',
  ming: 'The richest state on earth, guarding a long northern frontier against the steppe.',
};

export const NATIONS: NationDef[] = [
  ...PLAYABLE,
  ...NATION_TABLE.trim().split('\n').map(line => {
    const [id, name, adj, color, culture, religion, capital, personality, gold, army] = line.split(';');
    return { id, name, adj, color, culture, religion, capital, personality: personality as Personality, gold: +gold, army: ARMIES[army] ?? army.split(','), native: id === 'natives' || undefined, blurb: BLURBS[id] };
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

// Historical rulers of the leading realms. Gaps and the years after a list runs out get generated rulers.
export const RULERS: Record<string, HistRuler[]> = {
  ottomans: [
    { name: 'Mehmed II', traits: ['Ambitious', 'Able'], from: 1451, to: 1481 },
    { name: 'Bayezid II', traits: ['Pious'], from: 1481, to: 1512 },
    { name: 'Selim I', traits: ['Ruthless', 'Warrior'], from: 1512, to: 1520 },
    { name: 'Süleyman I', traits: ['Able', 'Ambitious'], from: 1520, to: 1566 },
    { name: 'Selim II', traits: ['Idle'], from: 1566, to: 1574 },
    { name: 'Murad III', traits: ['Idle'], from: 1574, to: 1595 },
    { name: 'Mehmed III', traits: ['Ruthless'], from: 1595, to: 1603 },
    { name: 'Ahmed I', traits: ['Pious'], from: 1603, to: 1617 },
    { name: 'Osman II', traits: ['Reformer', 'Reckless'], from: 1617, to: 1622 },
    { name: 'Mustafa I', traits: ['Unstable'], from: 1622, to: 1623 },
    { name: 'Murad IV', traits: ['Ruthless', 'Warrior'], from: 1623, to: 1640 },
    { name: 'Ibrahim', traits: ['Unstable'], from: 1640, to: 1648 },
    { name: 'Mehmed IV', traits: ['Idle'], from: 1648, to: 1687 },
    { name: 'Süleyman II', traits: ['Pious'], from: 1687, to: 1691 },
    { name: 'Ahmed II', traits: ['Weak'], from: 1691, to: 1695 },
    { name: 'Mustafa II', traits: ['Warrior'], from: 1695, to: 1703 },
    { name: 'Ahmed III', traits: ['Patron'], from: 1703, to: 1730 },
    { name: 'Mahmud I', traits: ['Able'], from: 1730, to: 1754 },
    { name: 'Osman III', traits: ['Idle'], from: 1754, to: 1757 },
    { name: 'Mustafa III', traits: ['Reformer'], from: 1757, to: 1774 },
    { name: 'Abdülhamid I', traits: ['Pious'], from: 1774, to: 1789 },
    { name: 'Selim III', traits: ['Reformer', 'Able'], from: 1789, to: 1807 },
    { name: 'Mustafa IV', traits: ['Weak'], from: 1807, to: 1808 },
    { name: 'Mahmud II', traits: ['Reformer', 'Ruthless'], from: 1808, to: 1839 },
  ],
  byzantium: [
    { name: 'Konstantinos XI', traits: ['Warrior', 'Pious'], from: 1449, to: 1460 },
  ],
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
    { name: 'Carlos III', traits: ['Reformer', 'Able'], from: 1759, to: 1788 },
    { name: 'Carlos IV', traits: ['Weak'], from: 1788, to: 1808 },
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
  // ---- the leading realms of every continent ----
  france: [
    { name: 'Charles VII', traits: ['Cunning'], from: 1422, to: 1461 },
    { name: 'Louis XI', traits: ['Cunning', 'Able'], from: 1461, to: 1483 },
    { name: 'Charles VIII', traits: ['Reckless', 'Ambitious'], from: 1483, to: 1498 },
    { name: 'Louis XII', traits: ['Generous'], from: 1498, to: 1515 },
    { name: 'François I', traits: ['Patron', 'Ambitious'], from: 1515, to: 1547 },
    { name: 'Henri II', traits: ['Warrior'], from: 1547, to: 1559 },
    { name: 'François II', traits: ['Sickly'], from: 1559, to: 1560 },
    { name: 'Charles IX', traits: ['Weak'], from: 1560, to: 1574 },
    { name: 'Henri III', traits: ['Cunning'], from: 1574, to: 1589 },
    { name: 'Henri IV', traits: ['Able', 'Magnanimous'], from: 1589, to: 1610 },
    { name: 'Louis XIII', traits: ['Pious'], from: 1610, to: 1643 },
    { name: 'Louis XIV', traits: ['Able', 'Ambitious'], from: 1643, to: 1715 },
    { name: 'Louis XV', traits: ['Idle'], from: 1715, to: 1774 },
    { name: 'Louis XVI', traits: ['Weak'], from: 1774, to: 1792 },
    { name: 'Napoléon Bonaparte', traits: ['Warrior', 'Able', 'Ambitious'], from: 1799, to: 1815 },
  ],
  england: [
    { name: 'Henry VI', traits: ['Weak', 'Pious'], from: 1422, to: 1461 },
    { name: 'Edward IV', traits: ['Warrior', 'Able'], from: 1461, to: 1483 },
    { name: 'Richard III', traits: ['Ruthless', 'Warrior'], from: 1483, to: 1485 },
    { name: 'Henry VII', traits: ['Cunning', 'Diligent'], from: 1485, to: 1509 },
    { name: 'Henry VIII', traits: ['Ambitious', 'Ruthless'], from: 1509, to: 1547 },
    { name: 'Edward VI', traits: ['Sickly', 'Pious'], from: 1547, to: 1553 },
    { name: 'Mary I', traits: ['Pious'], from: 1553, to: 1558 },
    { name: 'Elizabeth I', traits: ['Able', 'Cunning'], from: 1558, to: 1603 },
    { name: 'James I', traits: ['Magnanimous'], from: 1603, to: 1625 },
    { name: 'Charles I', traits: ['Reckless', 'Pious'], from: 1625, to: 1649 },
    { name: 'the Council of State', traits: ['Diligent'], from: 1649, to: 1653 },
    { name: 'Lord Protector Oliver Cromwell', traits: ['Warrior', 'Able', 'Pious'], from: 1653, to: 1658 },
    { name: 'Richard Cromwell', traits: ['Weak'], from: 1658, to: 1660 },
    { name: 'Charles II', traits: ['Patron', 'Cunning'], from: 1660, to: 1685 },
    { name: 'James II', traits: ['Pious', 'Reckless'], from: 1685, to: 1688 },
    { name: 'William III', traits: ['Able', 'Warrior'], from: 1688, to: 1702 },
    { name: 'Anne', traits: ['Sickly'], from: 1702, to: 1714 },
    { name: 'George I', traits: ['Idle'], from: 1714, to: 1727 },
    { name: 'George II', traits: ['Warrior'], from: 1727, to: 1760 },
    { name: 'George III', traits: ['Diligent'], from: 1760, to: 1820 },
  ],
  austria: [
    { name: 'Friedrich V', traits: ['Idle', 'Fortunate'], from: 1424, to: 1493 },
    { name: 'Maximilian I', traits: ['Ambitious', 'Warrior'], from: 1493, to: 1519 },
    { name: 'Karl V', traits: ['Ambitious'], from: 1519, to: 1521 },
    { name: 'Ferdinand I', traits: ['Diligent', 'Able'], from: 1521, to: 1564 },
    { name: 'Maximilian II', traits: ['Magnanimous'], from: 1564, to: 1576 },
    { name: 'Rudolf II', traits: ['Patron', 'Unstable'], from: 1576, to: 1612 },
    { name: 'Matthias', traits: ['Weak'], from: 1612, to: 1619 },
    { name: 'Ferdinand II', traits: ['Pious', 'Ambitious'], from: 1619, to: 1637 },
    { name: 'Ferdinand III', traits: ['Diligent'], from: 1637, to: 1657 },
    { name: 'Leopold I', traits: ['Pious', 'Patron'], from: 1657, to: 1705 },
    { name: 'Joseph I', traits: ['Able', 'Ambitious'], from: 1705, to: 1711 },
    { name: 'Karl VI', traits: ['Diligent'], from: 1711, to: 1740 },
    { name: 'Maria Theresia', traits: ['Able', 'Reformer'], from: 1740, to: 1780 },
    { name: 'Joseph II', traits: ['Reformer', 'Ambitious'], from: 1780, to: 1790 },
    { name: 'Leopold II', traits: ['Able'], from: 1790, to: 1792 },
    { name: 'Franz II', traits: ['Diligent'], from: 1792, to: 1835 },
  ],
  muscovy: [
    { name: 'Vasily II, the Blind', traits: ['Pious'], from: 1425, to: 1462 },
    { name: 'Ivan III, the Great', traits: ['Able', 'Ambitious'], from: 1462, to: 1505 },
    { name: 'Vasily III', traits: ['Ambitious'], from: 1505, to: 1533 },
    { name: 'Ivan IV, the Terrible', traits: ['Ruthless', 'Ambitious'], from: 1533, to: 1584 },
    { name: 'Fyodor I', traits: ['Pious', 'Weak'], from: 1584, to: 1598 },
    { name: 'Boris Godunov', traits: ['Cunning', 'Able'], from: 1598, to: 1605 },
    { name: 'False Dmitry', traits: ['Unstable'], from: 1605, to: 1606 },
    { name: 'Vasily IV Shuisky', traits: ['Weak'], from: 1606, to: 1610 },
    { name: 'Mikhail I Romanov', traits: ['Pious'], from: 1613, to: 1645 },
    { name: 'Alexei, the Quietest', traits: ['Pious', 'Diligent'], from: 1645, to: 1676 },
    { name: 'Fyodor III', traits: ['Sickly'], from: 1676, to: 1682 },
    { name: 'Regent Sofia Alekseyevna', traits: ['Cunning'], from: 1682, to: 1689 },
    { name: 'Peter I, the Great', traits: ['Able', 'Reformer', 'Ambitious'], from: 1689, to: 1725 },
    { name: 'Catherine I', traits: ['Weak'], from: 1725, to: 1727 },
    { name: 'Peter II', traits: ['Sickly'], from: 1727, to: 1730 },
    { name: 'Anna', traits: ['Ruthless'], from: 1730, to: 1740 },
    { name: 'Ivan VI', traits: ['Weak'], from: 1740, to: 1741 },
    { name: 'Elizabeth', traits: ['Patron'], from: 1741, to: 1762 },
    { name: 'Catherine II, the Great', traits: ['Able', 'Ambitious', 'Patron'], from: 1762, to: 1796 },
    { name: 'Paul I', traits: ['Unstable'], from: 1796, to: 1801 },
    { name: 'Alexander I', traits: ['Able'], from: 1801, to: 1825 },
  ],
  sweden: [
    { name: 'Karl VIII Knutsson', traits: ['Ambitious'], from: 1448, to: 1470 },
    { name: 'Regent Sten Sture the Elder', traits: ['Cunning', 'Able'], from: 1470, to: 1503 },
    { name: 'Regent Svante Nilsson', traits: ['Warrior'], from: 1504, to: 1512 },
    { name: 'Regent Sten Sture the Younger', traits: ['Warrior'], from: 1512, to: 1520 },
    { name: 'Gustav I Vasa', traits: ['Able', 'Ruthless'], from: 1521, to: 1560 },
    { name: 'Erik XIV', traits: ['Unstable'], from: 1560, to: 1568 },
    { name: 'Johan III', traits: ['Patron'], from: 1568, to: 1592 },
    { name: 'Sigismund', traits: ['Pious'], from: 1592, to: 1599 },
    { name: 'Karl IX', traits: ['Ambitious'], from: 1599, to: 1611 },
    { name: 'Gustav II Adolf', traits: ['Able', 'Warrior'], from: 1611, to: 1632 },
    { name: 'Kristina', traits: ['Patron', 'Cunning'], from: 1632, to: 1654 },
    { name: 'Karl X Gustav', traits: ['Warrior', 'Ambitious'], from: 1654, to: 1660 },
    { name: 'Karl XI', traits: ['Diligent', 'Reformer'], from: 1660, to: 1697 },
    { name: 'Karl XII', traits: ['Warrior', 'Reckless'], from: 1697, to: 1718 },
    { name: 'Ulrika Eleonora', traits: ['Weak'], from: 1718, to: 1720 },
    { name: 'Fredrik I', traits: ['Idle'], from: 1720, to: 1751 },
    { name: 'Adolf Fredrik', traits: ['Weak'], from: 1751, to: 1771 },
    { name: 'Gustav III', traits: ['Patron', 'Ambitious'], from: 1771, to: 1792 },
    { name: 'Gustav IV Adolf', traits: ['Unstable'], from: 1792, to: 1809 },
    { name: 'Karl XIII', traits: ['Weak'], from: 1809, to: 1818 },
  ],
  brandenburg: [
    { name: 'Friedrich II, Irontooth', traits: ['Pious'], from: 1440, to: 1470 },
    { name: 'Albrecht Achilles', traits: ['Warrior'], from: 1470, to: 1486 },
    { name: 'Johann Cicero', traits: ['Diligent'], from: 1486, to: 1499 },
    { name: 'Joachim I', traits: ['Pious'], from: 1499, to: 1535 },
    { name: 'Joachim II', traits: ['Patron'], from: 1535, to: 1571 },
    { name: 'Johann Georg', traits: ['Diligent'], from: 1571, to: 1598 },
    { name: 'Joachim Friedrich', traits: ['Diligent'], from: 1598, to: 1608 },
    { name: 'Johann Sigismund', traits: ['Weak'], from: 1608, to: 1619 },
    { name: 'Georg Wilhelm', traits: ['Weak'], from: 1619, to: 1640 },
    { name: 'Friedrich Wilhelm, the Great Elector', traits: ['Able', 'Reformer'], from: 1640, to: 1688 },
    { name: 'Friedrich I', traits: ['Patron'], from: 1688, to: 1713 },
    { name: 'Friedrich Wilhelm I, the Soldier King', traits: ['Diligent', 'Reformer'], from: 1713, to: 1740 },
    { name: 'Friedrich II, the Great', traits: ['Able', 'Warrior', 'Patron'], from: 1740, to: 1786 },
    { name: 'Friedrich Wilhelm II', traits: ['Idle'], from: 1786, to: 1797 },
    { name: 'Friedrich Wilhelm III', traits: ['Weak'], from: 1797, to: 1840 },
  ],
  ming: [
    { name: 'the Jingtai Emperor', traits: ['Diligent'], from: 1449, to: 1457 },
    { name: 'the Tianshun Emperor', traits: ['Weak'], from: 1457, to: 1464 },
    { name: 'the Chenghua Emperor', traits: ['Idle'], from: 1464, to: 1487 },
    { name: 'the Hongzhi Emperor', traits: ['Able', 'Diligent'], from: 1487, to: 1505 },
    { name: 'the Zhengde Emperor', traits: ['Reckless'], from: 1505, to: 1521 },
    { name: 'the Jiajing Emperor', traits: ['Idle'], from: 1521, to: 1567 },
    { name: 'the Longqing Emperor', traits: ['Reformer'], from: 1567, to: 1572 },
    { name: 'the Wanli Emperor', traits: ['Idle'], from: 1572, to: 1620 },
    { name: 'the Tianqi Emperor', traits: ['Weak'], from: 1620, to: 1627 },
    { name: 'the Chongzhen Emperor', traits: ['Diligent', 'Ruthless'], from: 1627, to: 1644 },
    { name: 'the Yongli Emperor', traits: ['Weak'], from: 1646, to: 1662 },
  ],
  japan: [
    { name: 'Ashikaga Yoshimasa', traits: ['Patron', 'Idle'], from: 1449, to: 1473 },
    { name: 'Ashikaga Yoshihisa', traits: ['Warrior'], from: 1473, to: 1489 },
    { name: 'Ashikaga Yoshitane', traits: ['Weak'], from: 1490, to: 1494 },
    { name: 'Ashikaga Yoshizumi', traits: ['Weak'], from: 1494, to: 1508 },
    { name: 'Ashikaga Yoshitane', traits: ['Ambitious'], from: 1508, to: 1521 },
    { name: 'Ashikaga Yoshiharu', traits: ['Weak'], from: 1521, to: 1546 },
    { name: 'Ashikaga Yoshiteru', traits: ['Warrior'], from: 1546, to: 1565 },
    { name: 'Ashikaga Yoshiaki', traits: ['Cunning'], from: 1568, to: 1573 },
    { name: 'Oda Nobunaga', traits: ['Ambitious', 'Ruthless', 'Warrior'], from: 1573, to: 1582 },
    { name: 'Toyotomi Hideyoshi', traits: ['Able', 'Ambitious'], from: 1582, to: 1598 },
    { name: 'Tokugawa Ieyasu', traits: ['Able', 'Cunning'], from: 1598, to: 1616 },
    { name: 'Tokugawa Hidetada', traits: ['Diligent'], from: 1616, to: 1623 },
    { name: 'Tokugawa Iemitsu', traits: ['Ruthless'], from: 1623, to: 1651 },
    { name: 'Tokugawa Ietsuna', traits: ['Weak'], from: 1651, to: 1680 },
    { name: 'Tokugawa Tsunayoshi', traits: ['Pious'], from: 1680, to: 1709 },
    { name: 'Tokugawa Ienobu', traits: ['Diligent'], from: 1709, to: 1712 },
    { name: 'Tokugawa Ietsugu', traits: ['Sickly'], from: 1713, to: 1716 },
    { name: 'Tokugawa Yoshimune', traits: ['Able', 'Reformer'], from: 1716, to: 1745 },
    { name: 'Tokugawa Ieshige', traits: ['Sickly'], from: 1745, to: 1760 },
    { name: 'Tokugawa Ieharu', traits: ['Idle'], from: 1760, to: 1786 },
    { name: 'Tokugawa Ienari', traits: ['Idle'], from: 1787, to: 1837 },
  ],
  delhi: [
    { name: 'Bahlul Lodi', traits: ['Able', 'Warrior'], from: 1451, to: 1489 },
    { name: 'Sikandar Lodi', traits: ['Diligent', 'Pious'], from: 1489, to: 1517 },
    { name: 'Ibrahim Lodi', traits: ['Reckless'], from: 1517, to: 1526 },
    { name: 'Sher Shah Suri', traits: ['Able', 'Reformer'], from: 1540, to: 1545 },
    { name: 'Islam Shah Suri', traits: ['Diligent'], from: 1545, to: 1554 },
  ],
  vijayanagara: [
    { name: 'Mallikarjuna Raya', traits: ['Weak'], from: 1446, to: 1465 },
    { name: 'Virupaksha Raya II', traits: ['Idle'], from: 1465, to: 1485 },
    { name: 'Saluva Narasimha', traits: ['Warrior', 'Able'], from: 1485, to: 1491 },
    { name: 'Regent Narasa Nayaka', traits: ['Cunning'], from: 1491, to: 1503 },
    { name: 'Vira Narasimha Raya', traits: ['Warrior'], from: 1505, to: 1509 },
    { name: 'Krishnadevaraya', traits: ['Able', 'Warrior', 'Patron'], from: 1509, to: 1529 },
    { name: 'Achyuta Deva Raya', traits: ['Diligent'], from: 1529, to: 1542 },
    { name: 'Sadasiva Raya', traits: ['Weak'], from: 1542, to: 1570 },
    { name: 'Tirumala Deva Raya', traits: ['Warrior'], from: 1570, to: 1572 },
    { name: 'Sriranga I', traits: ['Weak'], from: 1572, to: 1586 },
    { name: 'Venkata II', traits: ['Able'], from: 1586, to: 1614 },
  ],
  safavids: [
    { name: 'Shah Abbas I', traits: ['Able', 'Ambitious'], from: 1588, to: 1629 },
    { name: 'Shah Safi', traits: ['Ruthless'], from: 1629, to: 1642 },
    { name: 'Shah Abbas II', traits: ['Able'], from: 1642, to: 1666 },
    { name: 'Shah Suleiman', traits: ['Idle'], from: 1666, to: 1694 },
    { name: 'Shah Sultan Husayn', traits: ['Pious', 'Weak'], from: 1694, to: 1722 },
    { name: 'Shah Tahmasp II', traits: ['Weak'], from: 1722, to: 1732 },
    { name: 'Nader Shah', traits: ['Warrior', 'Able', 'Ruthless'], from: 1736, to: 1747 },
    { name: 'Karim Khan Zand', traits: ['Magnanimous'], from: 1751, to: 1779 },
  ],
  marathas: [
    { name: 'Tarabai', traits: ['Able', 'Cunning'], from: 1700, to: 1708 },
    { name: 'Shahu I', traits: ['Magnanimous'], from: 1708, to: 1749 },
    { name: 'Rajaram II', traits: ['Weak'], from: 1749, to: 1777 },
    { name: 'Shahu II', traits: ['Weak'], from: 1777, to: 1808 },
  ],
  mali: [
    { name: 'Mansa Mahmud II', traits: ['Weak'], from: 1481, to: 1496 },
    { name: 'Mansa Mahmud III', traits: ['Cunning'], from: 1496, to: 1559 },
    { name: 'Mansa Mahmud IV', traits: ['Ambitious'], from: 1590, to: 1610 },
  ],
  songhai: [
    { name: 'Sunni Sulayman Dandi', traits: ['Warrior'], from: 1441, to: 1464 },
    { name: 'Sunni Ali Ber', traits: ['Warrior', 'Ruthless', 'Able'], from: 1464, to: 1492 },
    { name: 'Sunni Baru', traits: ['Weak'], from: 1492, to: 1493 },
    { name: 'Askia Muhammad I', traits: ['Able', 'Pious'], from: 1493, to: 1528 },
    { name: 'Askia Musa', traits: ['Ruthless'], from: 1528, to: 1531 },
    { name: 'Askia Muhammad Benkan', traits: ['Reckless'], from: 1531, to: 1537 },
    { name: 'Askia Ismail', traits: ['Weak'], from: 1537, to: 1539 },
    { name: 'Askia Ishaq I', traits: ['Able'], from: 1539, to: 1549 },
    { name: 'Askia Dawud', traits: ['Diligent', 'Patron'], from: 1549, to: 1582 },
    { name: 'Askia Muhammad al-Hajj', traits: ['Sickly'], from: 1582, to: 1586 },
    { name: 'Askia Muhammad Bani', traits: ['Weak'], from: 1586, to: 1588 },
    { name: 'Askia Ishaq II', traits: ['Weak'], from: 1588, to: 1592 },
  ],
  ethiopia: [
    { name: 'Zara Yaqob', traits: ['Pious', 'Able'], from: 1434, to: 1468 },
    { name: 'Baeda Maryam I', traits: ['Diligent'], from: 1468, to: 1478 },
    { name: 'Eskender', traits: ['Weak'], from: 1478, to: 1494 },
    { name: 'Na’od', traits: ['Pious'], from: 1494, to: 1508 },
    { name: 'Lebna Dengel', traits: ['Ambitious', 'Reckless'], from: 1508, to: 1540 },
    { name: 'Gelawdewos', traits: ['Warrior', 'Able'], from: 1540, to: 1559 },
    { name: 'Minas', traits: ['Warrior'], from: 1559, to: 1563 },
    { name: 'Sarsa Dengel', traits: ['Warrior'], from: 1563, to: 1597 },
    { name: 'Yaqob', traits: ['Weak'], from: 1597, to: 1606 },
    { name: 'Susenyos I', traits: ['Ambitious', 'Warrior'], from: 1606, to: 1632 },
    { name: 'Fasilides', traits: ['Able', 'Patron'], from: 1632, to: 1667 },
    { name: 'Yohannes I', traits: ['Pious'], from: 1667, to: 1682 },
    { name: 'Iyasu I, the Great', traits: ['Able', 'Warrior'], from: 1682, to: 1706 },
    { name: 'Tekle Haymanot I', traits: ['Weak'], from: 1706, to: 1708 },
    { name: 'Tewoflos', traits: ['Weak'], from: 1708, to: 1711 },
    { name: 'Yostos', traits: ['Cunning'], from: 1711, to: 1716 },
    { name: 'Dawit III', traits: ['Weak'], from: 1716, to: 1721 },
    { name: 'Bakaffa', traits: ['Ruthless'], from: 1721, to: 1730 },
    { name: 'Iyasu II', traits: ['Patron'], from: 1730, to: 1755 },
    { name: 'Iyoas I', traits: ['Weak'], from: 1755, to: 1769 },
    { name: 'Tekle Haymanot II', traits: ['Weak'], from: 1769, to: 1777 },
  ],
  kongo: [
    { name: 'Nzinga a Nkuwu', traits: ['Pious'], from: 1470, to: 1509 },
    { name: 'Afonso I Mvemba a Nzinga', traits: ['Able', 'Pious'], from: 1509, to: 1542 },
    { name: 'Pedro I', traits: ['Weak'], from: 1543, to: 1545 },
    { name: 'Diogo I', traits: ['Ambitious'], from: 1545, to: 1561 },
    { name: 'Álvaro I', traits: ['Warrior'], from: 1568, to: 1587 },
    { name: 'Álvaro II', traits: ['Able'], from: 1587, to: 1614 },
    { name: 'Garcia II', traits: ['Cunning', 'Pious'], from: 1641, to: 1660 },
    { name: 'António I', traits: ['Reckless'], from: 1660, to: 1665 },
    { name: 'Pedro IV', traits: ['Magnanimous'], from: 1695, to: 1718 },
  ],
  aztec: [
    { name: 'Moctezuma I', traits: ['Able', 'Ambitious'], from: 1440, to: 1469 },
    { name: 'Axayacatl', traits: ['Warrior'], from: 1469, to: 1481 },
    { name: 'Tizoc', traits: ['Weak'], from: 1481, to: 1486 },
    { name: 'Ahuitzotl', traits: ['Warrior', 'Ambitious'], from: 1486, to: 1502 },
    { name: 'Moctezuma II', traits: ['Pious', 'Ambitious'], from: 1502, to: 1520 },
    { name: 'Cuauhtémoc', traits: ['Warrior'], from: 1520, to: 1525 },
  ],
  inca: [
    { name: 'Pachacuti', traits: ['Able', 'Ambitious'], from: 1438, to: 1471 },
    { name: 'Túpac Inca Yupanqui', traits: ['Warrior', 'Able'], from: 1471, to: 1493 },
    { name: 'Huayna Cápac', traits: ['Ambitious', 'Warrior'], from: 1493, to: 1527 },
    { name: 'Huáscar', traits: ['Weak'], from: 1527, to: 1532 },
    { name: 'Atahualpa', traits: ['Ruthless'], from: 1532, to: 1533 },
    { name: 'Manco Inca', traits: ['Warrior'], from: 1533, to: 1544 },
  ],
  thirteen_colonies: [
    { name: 'the Continental Congress', traits: ['Diligent'], from: 1774, to: 1789 },
    { name: 'President George Washington', traits: ['Able', 'Warrior'], from: 1789, to: 1797 },
    { name: 'President John Adams', traits: ['Diligent'], from: 1797, to: 1801 },
    { name: 'President Thomas Jefferson', traits: ['Patron', 'Reformer'], from: 1801, to: 1809 },
    { name: 'President James Madison', traits: ['Diligent'], from: 1809, to: 1817 },
  ],
  jurchens: [
    { name: 'Nurhaci', traits: ['Warrior', 'Able'], from: 1583, to: 1626 },
    { name: 'Hong Taiji', traits: ['Able', 'Ambitious'], from: 1626, to: 1643 },
    { name: 'the Shunzhi Emperor', traits: ['Weak'], from: 1643, to: 1661 },
    { name: 'the Kangxi Emperor', traits: ['Able', 'Ambitious'], from: 1661, to: 1722 },
    { name: 'the Yongzheng Emperor', traits: ['Diligent', 'Reformer'], from: 1722, to: 1735 },
    { name: 'the Qianlong Emperor', traits: ['Able', 'Patron'], from: 1735, to: 1796 },
    { name: 'the Jiaqing Emperor', traits: ['Diligent'], from: 1796, to: 1820 },
  ],
  timurids: [
    { name: 'Abu Sa’id Mirza', traits: ['Ambitious', 'Warrior'], from: 1451, to: 1469 },
    { name: 'Sultan Husayn Bayqara', traits: ['Patron'], from: 1469, to: 1506 },
    { name: 'Babur', traits: ['Warrior', 'Able'], from: 1506, to: 1530 },
    { name: 'Humayun', traits: ['Fortunate'], from: 1530, to: 1556 },
    { name: 'Akbar the Great', traits: ['Able', 'Ambitious'], from: 1556, to: 1605 },
    { name: 'Jahangir', traits: ['Patron'], from: 1605, to: 1627 },
    { name: 'Shah Jahan', traits: ['Patron', 'Ambitious'], from: 1627, to: 1658 },
    { name: 'Aurangzeb', traits: ['Pious', 'Ambitious', 'Warrior'], from: 1658, to: 1707 },
    { name: 'Bahadur Shah I', traits: ['Weak'], from: 1707, to: 1712 },
    { name: 'Farrukhsiyar', traits: ['Weak'], from: 1713, to: 1719 },
    { name: 'Muhammad Shah', traits: ['Idle'], from: 1719, to: 1748 },
    { name: 'Ahmad Shah Bahadur', traits: ['Weak'], from: 1748, to: 1754 },
    { name: 'Alamgir II', traits: ['Weak'], from: 1754, to: 1759 },
    { name: 'Shah Alam II', traits: ['Weak'], from: 1759, to: 1806 },
    { name: 'Akbar II', traits: ['Weak'], from: 1806, to: 1837 },
  ],
  mughals: [
    { name: 'Babur', traits: ['Warrior', 'Able'], from: 1526, to: 1530 },
    { name: 'Humayun', traits: ['Fortunate'], from: 1530, to: 1556 },
    { name: 'Akbar the Great', traits: ['Able', 'Ambitious'], from: 1556, to: 1605 },
    { name: 'Jahangir', traits: ['Patron'], from: 1605, to: 1627 },
    { name: 'Shah Jahan', traits: ['Patron', 'Ambitious'], from: 1627, to: 1658 },
    { name: 'Aurangzeb', traits: ['Pious', 'Ambitious', 'Warrior'], from: 1658, to: 1707 },
    { name: 'Bahadur Shah I', traits: ['Weak'], from: 1707, to: 1712 },
    { name: 'Farrukhsiyar', traits: ['Weak'], from: 1713, to: 1719 },
    { name: 'Muhammad Shah', traits: ['Idle'], from: 1719, to: 1748 },
    { name: 'Ahmad Shah Bahadur', traits: ['Weak'], from: 1748, to: 1754 },
    { name: 'Alamgir II', traits: ['Weak'], from: 1754, to: 1759 },
    { name: 'Shah Alam II', traits: ['Weak'], from: 1759, to: 1806 },
    { name: 'Akbar II', traits: ['Weak'], from: 1806, to: 1837 },
  ],
};
// realms that change their name keep their rulers' list
RULERS.qing = RULERS.jurchens;

type Rates = Partial<Record<'military' | 'diplomacy' | 'internal' | 'economy' | 'research' | 'culture', number>>;

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
