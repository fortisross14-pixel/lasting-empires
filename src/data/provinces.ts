// World provinces in 1453. One line each:
// id;Name;owner;development;fort;lon;lat;raw material;discovery region[;culture]
// Regions marked as known at the start are listed in KNOWN_REGIONS.

export const KNOWN_REGIONS = ['europe', 'north_africa', 'middle_east', 'atlantic', 'russia', 'central_asia'];

const TABLE = `
coruna;A Coruña;castile;2;0;-8.4;43.3;fish;europe
santiago;Santiago;castile;3;0;-8.5;42.75;meat;europe
lugo;Lugo;castile;2;0;-7.55;43.0;meat;europe
ourense;Ourense;castile;2;0;-7.85;42.3;produce;europe
oviedo;Oviedo;castile;2;0;-5.85;43.35;coal;europe
santander;Santander;castile;2;0;-4.0;43.25;fish;europe
bilbao;Biscay;castile;3;0;-2.95;43.2;iron;europe
sansebastian;Gipuzkoa;castile;2;0;-2.1;43.15;iron;europe
vitoria;Álava;castile;2;0;-2.7;42.85;grain;europe
leon;León;castile;3;0;-5.6;42.6;meat;europe
zamora;Zamora;castile;2;0;-5.9;41.65;grain;europe
salamanca;Salamanca;castile;3;0;-5.65;40.95;meat;europe
valladolid;Valladolid;castile;4;1;-4.7;41.65;grain;europe
palencia;Palencia;castile;2;0;-4.5;42.2;grain;europe
burgos;Burgos;castile;3;1;-3.7;42.35;fibres;europe
soria;Soria;castile;2;0;-2.45;41.75;fibres;europe
logrono;La Rioja;castile;2;0;-2.45;42.4;produce;europe
segovia;Segovia;castile;3;0;-4.1;40.95;fibres;europe
avila;Ávila;castile;2;0;-4.7;40.6;fibres;europe
madrid;Madrid;castile;3;0;-3.7;40.4;grain;europe
toledo;Toledo;castile;4;1;-4.0;39.85;iron;europe
guadalajara;Guadalajara;castile;2;0;-2.9;40.75;grain;europe
cuenca;Cuenca;castile;2;0;-2.1;40.05;wood;europe
ciudadreal;La Mancha;castile;2;0;-3.4;39.0;produce;europe
albacete;Albacete;castile;2;0;-1.85;38.95;grain;europe
caceres;Cáceres;castile;2;0;-6.4;39.45;meat;europe
badajoz;Badajoz;castile;2;0;-6.65;38.75;meat;europe
plasencia;Plasencia;castile;2;0;-5.9;40.1;meat;europe
seville;Seville;castile;5;1;-5.95;37.4;produce;europe
cordoba;Córdoba;castile;3;0;-4.8;37.9;leather;europe
jaen;Jaén;castile;2;0;-3.8;37.75;produce;europe
huelva;Niebla;castile;2;0;-6.9;37.4;fish;europe
jerez;Jerez;castile;3;0;-6.05;36.65;produce;europe
murcia;Murcia;castile;3;0;-1.15;38.0;dyes;europe
cartagena;Cartagena;castile;2;0;-1.05;37.6;saltpetre;europe
granada;Granada;granada;4;2;-3.6;37.2;fibres;europe
malaga;Málaga;granada;3;1;-4.5;36.75;produce;europe
almeria;Almería;granada;2;1;-2.45;36.95;fibres;europe
porto;Porto;portugal;3;1;-8.55;41.15;produce;europe
braga;Minho;portugal;2;0;-8.4;41.65;meat;europe
braganca;Trás-os-Montes;portugal;2;0;-7.0;41.6;iron;europe
coimbra;Coimbra;portugal;3;0;-8.4;40.2;grain;europe
viseu;Beira;portugal;2;0;-7.4;40.6;wood;europe
lisbon;Lisbon;portugal;5;2;-9.1;38.75;saltpetre;europe
evora;Alentejo;portugal;2;0;-7.9;38.55;coal;europe
faro;Algarve;portugal;2;0;-8.2;37.15;fish;europe
pamplona;Navarre;navarre;2;1;-1.65;42.8;grain;europe
zaragoza;Zaragoza;aragon;4;1;-0.9;41.65;grain;europe
huesca;Huesca;aragon;2;0;-0.4;42.15;iron;europe
teruel;Teruel;aragon;2;0;-1.1;40.35;fibres;europe
barcelona;Barcelona;aragon;5;1;2.1;41.45;fibres;europe
girona;Girona;aragon;2;0;2.8;42.0;meat;europe
lleida;Lleida;aragon;2;0;0.7;41.75;grain;europe
tarragona;Tarragona;aragon;2;0;1.1;41.15;produce;europe
valencia;Valencia;aragon;4;0;-0.45;39.45;fibres;europe
alicante;Alicante;aragon;2;0;-0.6;38.45;saltpetre;europe
majorca;Majorca;aragon;2;0;2.95;39.6;produce;europe
cagliari;Cagliari;aragon;2;0;9.0;39.35;saltpetre;europe
sassari;Sassari;aragon;1;0;8.7;40.6;gold;europe
palermo;Palermo;aragon;3;1;13.4;37.95;grain;europe
messina;Messina;aragon;2;0;15.2;38.05;coal;europe
syracuse;Syracuse;aragon;2;0;14.9;37.15;grain;europe
paris;Paris;france;6;2;2.35;48.85;grain;europe
rouen;Normandy;france;4;1;1.0;49.3;meat;europe
caen;Lower Normandy;france;2;0;-0.6;49.1;iron;europe
amiens;Picardy;france;3;0;2.3;49.9;grain;europe
reims;Champagne;france;3;0;4.0;49.2;produce;europe
orleans;Orléans;france;3;0;1.9;47.9;grain;europe
tours;Touraine;france;3;0;0.7;47.4;produce;europe
angers;Anjou;france;2;0;-0.55;47.45;produce;europe
poitiers;Poitou;france;2;0;0.35;46.6;grain;europe
bordeaux;Guyenne;france;4;1;-0.6;44.85;produce;europe
bayonne;Gascony;france;2;0;-1.0;43.75;coal;europe
toulouse;Toulouse;france;3;0;1.45;43.6;dyes;europe
montpellier;Languedoc;france;3;0;3.9;43.65;produce;europe
clermont;Auvergne;france;2;0;3.1;45.75;meat;europe
limoges;Limousin;france;2;0;1.25;45.85;meat;europe
bourges;Berry;france;2;0;2.4;47.05;fibres;europe
lyon;Lyon;france;4;1;4.85;45.75;fibres;europe
grenoble;Dauphiné;france;2;0;5.75;45.2;wood;europe
marseille;Provence;france;3;1;5.4;43.45;produce;europe
rennes;Rennes;brittany;3;1;-1.7;48.1;meat;europe
brest;Brest;brittany;2;0;-4.3;48.3;fish;europe
dijon;Burgundy;burgundy;4;1;5.0;47.3;produce;europe
besancon;Franche-Comté;burgundy;2;0;6.0;47.25;saltpetre;europe
bruges;Flanders;burgundy;5;0;3.2;51.0;fibres;europe
brussels;Brabant;burgundy;4;0;4.4;50.85;fibres;europe
amsterdam;Holland;burgundy;3;0;4.8;52.35;fish;europe
arras;Artois;burgundy;2;0;2.8;50.3;grain;europe
luxembourg;Luxembourg;burgundy;2;1;6.1;49.6;iron;europe
calais;Calais;england;2;2;1.85;50.95;fibres;europe
london;London;england;5;2;-0.1;51.5;fibres;europe
winchester;Wessex;england;3;0;-1.9;51.0;fibres;europe
exeter;Devon;england;2;0;-3.6;50.7;wood;europe
norwich;East Anglia;england;3;0;1.2;52.6;fibres;europe
coventry;Midlands;england;3;0;-1.5;52.45;fibres;europe
york;York;england;3;1;-1.1;53.95;fibres;europe
durham;Northumbria;england;2;1;-1.6;54.9;iron;europe
lancaster;Lancashire;england;2;0;-2.7;53.8;coal;europe
cardiff;Wales;england;2;0;-3.6;52.0;coal;europe
dublin;The Pale;england;2;1;-6.3;53.35;meat;europe
edinburgh;Edinburgh;scotland;3;1;-3.2;55.95;fibres;europe
glasgow;Strathclyde;scotland;2;0;-4.6;55.75;fish;europe
inverness;Highlands;scotland;1;0;-4.5;57.3;wood;europe
cork;Munster;ireland;2;0;-8.5;52.0;meat;europe
galway;Connacht;ireland;1;0;-9.0;53.4;meat;europe
ulster;Ulster;ireland;1;0;-6.9;54.6;meat;europe
copenhagen;Zealand;denmark;4;1;12.0;55.5;fish;europe
jutland;Jutland;denmark;3;0;9.2;56.2;meat;europe
scania;Scania;denmark;3;0;13.4;55.85;grain;europe
oslo;Oslo;denmark;2;0;10.6;60.2;wood;europe
bergen;Bergen;denmark;2;0;6.3;60.6;fish;europe
trondheim;Trøndelag;denmark;1;0;10.6;63.3;fish;europe
iceland;Iceland;denmark;1;0;-19.0;64.8;fish;europe
stockholm;Stockholm;sweden;3;1;17.6;59.7;iron;europe
gothenburg;Götaland;sweden;2;0;14.0;57.8;wood;europe
norrland;Norrland;sweden;1;0;17.5;63.5;leather;europe
turku;Finland;sweden;2;0;23.3;61.0;leather;europe
lubeck;Lübeck;hansa;4;1;10.4;53.85;fish;europe
hamburg;Hamburg;hansa;4;1;9.7;53.4;grain;europe
cologne;Cologne;cologne;4;1;7.0;50.9;coal;europe
heidelberg;Palatinate;palatinate;3;0;8.6;49.5;produce;europe
kassel;Hesse;hesse;2;0;9.4;51.1;wood;europe
stuttgart;Württemberg;wurttemberg;3;0;9.2;48.75;produce;europe
luneburg;Brunswick;brunswick;3;0;10.2;52.6;saltpetre;europe
berlin;Brandenburg;brandenburg;3;1;13.4;52.5;grain;europe
stettin;Pomerania;brandenburg;2;0;14.6;53.5;grain;europe
dresden;Saxony;saxony;3;1;13.6;51.0;gold;europe
erfurt;Thuringia;saxony;2;0;11.0;50.95;grain;europe
munich;Bavaria;bavaria;3;1;11.6;48.1;saltpetre;europe
regensburg;Upper Palatinate;bavaria;2;0;12.1;49.0;iron;europe
vienna;Vienna;austria;5;2;16.4;48.2;produce;europe
graz;Styria;austria;3;1;15.4;47.1;iron;europe
innsbruck;Tyrol;austria;3;1;11.4;47.25;gold;europe
ljubljana;Carniola;austria;2;0;14.5;46.05;iron;europe
bern;Switzerland;swiss;3;1;7.5;46.95;meat;europe
zurich;Zurich;swiss;3;0;8.55;47.35;meat;europe
prague;Prague;bohemia;5;1;14.4;50.1;gold;europe
brno;Moravia;bohemia;3;0;16.6;49.2;grain;europe
breslau;Silesia;bohemia;3;0;17.0;51.1;coal;europe
turin;Piedmont;savoy;3;1;7.7;45.05;grain;europe
chambery;Savoy;savoy;2;1;5.9;45.55;meat;europe
milan;Milan;milan;5;1;9.2;45.45;iron;europe
parma;Parma;milan;3;0;10.3;44.8;meat;europe
genoa;Genoa;genoa;4;1;8.95;44.4;fish;europe
corsica;Corsica;genoa;1;0;9.1;42.15;wood;europe
venice;Venice;venice;5;2;12.3;45.45;saltpetre;europe
verona;Verona;venice;3;0;11.0;45.45;fibres;europe
zara;Dalmatia;venice;2;0;15.8;43.9;wood;europe
candia;Crete;venice;2;1;24.9;35.25;produce;europe
florence;Florence;florence;5;0;11.25;43.75;dyes;europe
pisa;Pisa;florence;2;0;10.5;43.6;fish;europe
rome;Rome;papacy;5;1;12.5;41.9;produce;europe
bologna;Romagna;papacy;3;0;11.6;44.4;grain;europe
ancona;Marche;papacy;2;0;13.3;43.45;grain;europe
perugia;Umbria;papacy;2;0;12.4;43.05;produce;europe
naples;Naples;naples;5;1;14.25;40.85;fibres;europe
abruzzo;Abruzzo;naples;2;0;13.9;42.2;fibres;europe
bari;Apulia;naples;3;0;16.6;41.0;produce;europe
cosenza;Calabria;naples;2;0;16.25;39.2;fibres;europe
krakow;Kraków;poland;4;1;19.9;50.05;saltpetre;europe
warsaw;Masovia;poland;3;0;21.0;52.25;grain;europe
poznan;Greater Poland;poland;3;0;16.9;52.4;grain;europe
lviv;Red Ruthenia;poland;2;0;24.0;49.85;grain;europe
vilnius;Vilnius;lithuania;3;1;25.3;54.7;wood;europe
minsk;Minsk;lithuania;2;0;27.55;53.9;wood;russia
kiev;Kiev;lithuania;3;0;30.5;50.45;grain;russia
smolensk;Smolensk;lithuania;2;1;32.05;54.8;wood;russia
lutsk;Volhynia;lithuania;2;0;25.3;50.75;grain;europe
danzig;Danzig;teutonic;3;1;18.65;54.35;grain;europe
konigsberg;Prussia;teutonic;2;1;20.5;54.7;grain;europe
riga;Livonia;teutonic;2;1;24.1;56.95;leather;europe
buda;Buda;hungary;5;1;19.05;47.5;produce;europe
pressburg;Upper Hungary;hungary;3;0;18.5;48.6;gold;europe
kolozsvar;Transylvania;hungary;3;1;23.6;46.75;gold;europe
zagreb;Croatia;hungary;2;0;16.0;45.8;wood;europe
temesvar;Banat;hungary;2;1;21.2;45.75;grain;europe
moscow;Moscow;muscovy;4;1;37.6;55.75;leather;russia
ryazan;Ryazan;muscovy;2;0;39.7;54.6;grain;russia
nizhny;Nizhny Novgorod;muscovy;2;0;44.0;56.3;leather;russia
vologda;Vologda;muscovy;1;0;39.9;59.2;leather;russia
novgorod;Novgorod;novgorod;3;1;31.3;58.5;leather;russia
pskov;Pskov;novgorod;2;1;28.35;57.8;wood;russia
dvina;Dvina;novgorod;1;0;40.5;64.5;leather;russia
kazan;Kazan;kazan;2;1;49.1;55.8;leather;russia
astrakhan;Sarai;horde;2;0;46.0;47.0;leather;russia
crimea;Crimea;crimea;2;1;34.1;44.95;leather;russia
suceava;Moldavia;moldavia;2;1;26.25;47.65;meat;europe
tirgoviste;Wallachia;wallachia;2;1;25.45;44.9;grain;europe
bosnia;Bosnia;bosnia;2;1;18.0;44.0;gold;europe
belgrade;Serbia;serbia;2;1;20.9;44.0;gold;europe
kruja;Albania;albania;1;1;19.8;41.5;fibres;europe
constantinople;Constantinople;byzantium;6;3;28.95;41.05;fibres;europe
mistra;Morea;byzantium;2;1;22.4;37.25;produce;europe
edirne;Thrace;ottomans;4;1;26.55;41.7;grain;europe
thessaloniki;Macedonia;ottomans;3;1;22.95;40.65;grain;europe
sofia;Bulgaria;ottomans;3;0;23.3;42.7;grain;europe
athens;Greece;ottomans;2;0;22.4;39.3;produce;europe
herat;Herat;timurids;4;1;62.2;34.35;fibres;central_asia
mashhad;Khorasan;timurids;3;0;59.6;36.3;leather;central_asia
samarkand;Samarkand;timurids;5;1;66.95;39.65;fibres;central_asia
bukhara;Bukhara;timurids;3;0;64.4;39.8;fibres;central_asia
kandahar;Kandahar;timurids;2;0;65.7;31.6;iron;central_asia
kazakh;Kazakh Steppe;uzbeks;1;0;68.0;47.0;leather;central_asia
madeira;Madeira;portugal;1;0;-16.95;32.7;spices;atlantic
azores;Azores;portugal;1;0;-25.6;37.8;grain;atlantic
canaries;Canary Islands;natives;1;0;-15.5;28.1;spices;atlantic
`;

const TABLE_WORLD = `
# amaf
pueblo;Pueblo Lands;natives;1;0;-106.0;35.5;fibres;north_america;pueblo
dakota;Dakota;natives;1;0;-100.5;46.5;meat;north_america;sioux
blackfoot;Blackfoot;natives;1;0;-110.0;47.5;leather;north_america;algonquian
prairies;Saskatchewan;natives;1;0;-106.0;53.0;leather;north_america;cree
fraser;Fraser;natives;1;0;-123.5;52.5;fish;north_america;salish
mackenzie;Mackenzie;natives;1;0;-120.0;61.5;leather;north_america;dene
kivalliq;Kivalliq;natives;1;0;-95.0;63.0;fish;north_america;inuit
labrador;Labrador;natives;1;0;-62.0;54.0;fish;north_america;algonquian
havana;Havana;natives;1;0;-82.4;22.8;spices;caribbean;taino
sonora;Sonora;natives;1;0;-110.0;29.5;gold;mexico;yaqui
nicaragua;Nicaragua;natives;2;0;-85.5;12.8;fibres;mexico;nahua
lima;Ychsma;natives;2;0;-76.8;-12.0;fibres;andes;quechua
copiapo;Copiapó;natives;1;0;-70.0;-27.5;gold;andes;diaguita
araucania;Araucanía;natives;1;0;-72.5;-38.5;wood;andes;mapuche
matogrosso;Mato Grosso;natives;1;0;-55.0;-13.0;wood;brazil;ge
goias;Goiás;natives;1;0;-48.5;-14.5;gold;brazil;ge
guapore;Guaporé;natives;1;0;-63.5;-10.0;wood;brazil;arawak
solimoes;Solimões;natives;1;0;-69.0;-4.0;spices;brazil;tupi
chaco;Gran Chaco;natives;1;0;-61.0;-23.0;wood;plata;guaycuru
pampas;Pampas;natives;1;0;-63.0;-37.0;meat;plata;tehuelche
uruguay;Banda Oriental;natives;1;0;-56.0;-32.5;meat;plata;charrua
santacruz;Santa Cruz;natives;1;0;-70.0;-49.5;fibres;plata;tehuelche
futajallon;Futa Jallon;natives;1;0;-12.0;11.0;meat;west_africa;fulani
liberia;Grain Coast;natives;1;0;-9.5;7.0;spices;west_africa;manding
air;Aïr;natives;2;0;8.5;17.5;saltpetre;west_africa;berber
darfur;Darfur;natives;2;0;24.5;13.5;meat;west_africa;fur
cameroon;Cameroon;natives;1;0;12.5;5.5;gold;central_africa;bantu
loango;Loango;natives;2;0;12.0;-2.0;gold;central_africa;bantu
ubangi;Ubangi;natives;1;0;19.5;4.0;gold;central_africa;bantu
ituri;Ituri;natives;1;0;27.5;2.0;gold;central_africa;bantu
kasai;Kasai;natives;1;0;21.5;-7.0;iron;central_africa;bantu
namibia;Namib;natives;1;0;17.5;-22.0;meat;southern_africa;khoisan
highveld;Highveld;natives;1;0;27.5;-26.5;meat;southern_africa;bantu
natal;Natal;natives;1;0;30.5;-29.0;meat;southern_africa;bantu
barotse;Barotse;natives;1;0;23.5;-15.5;meat;southern_africa;bantu
sennar;Alodia;natives;2;0;33.5;13.5;fibres;east_africa;nubian
kitara;Kitara;natives;2;0;31.5;1.0;meat;east_africa;bantu
majeerteen;Majeerteen;natives;1;0;48.5;9.0;spices;east_africa;somali
unyamwezi;Unyamwezi;natives;1;0;33.0;-5.5;gold;east_africa;bantu
# mena
bursa;Bursa;ottomans;6;2;29.05;40.15;fibres;middle_east;turkish
kocaeli;Kocaeli;ottomans;3;1;30.35;40.6;wood;middle_east;turkish
karesi;Karesi;ottomans;2;0;27.75;39.75;grain;middle_east;turkish
izmir;İzmir;ottomans;3;1;27.35;38.5;produce;middle_east;greek
aydin;Aydın;ottomans;3;0;28.3;37.75;fibres;middle_east;turkish
kutahya;Germiyan;ottomans;3;0;29.95;39.35;fibres;middle_east;turkish
hamid;Hamid;ottomans;2;0;30.4;38.1;fibres;middle_east;turkish
antalya;Antalya;ottomans;3;1;30.65;37.0;wood;middle_east;turkish
eskisehir;Sultanönü;ottomans;2;0;31.15;39.6;iron;middle_east;turkish
bolu;Bolu;ottomans;2;0;31.85;40.8;coal;middle_east;turkish
ankara;Ankara;ottomans;4;1;32.85;39.95;fibres;middle_east;turkish
amasya;Amasya;ottomans;3;1;35.85;40.65;grain;middle_east;turkish
sivas;Sivas;ottomans;3;1;37.0;39.75;leather;middle_east;turkish
kastamonu;Kastamonu;candar;3;1;33.75;41.3;iron;middle_east;turkish
sinop;Sinop;candar;3;1;34.95;41.7;wood;middle_east;turkish
konya;Konya;karaman;5;2;32.5;37.85;fibres;middle_east;turkish
larende;Larende;karaman;3;1;33.25;37.2;grain;middle_east;turkish
kirsehir;Kırşehir;karaman;2;0;34.15;39.15;grain;middle_east;turkish
kayseri;Kayseri;karaman;3;1;35.5;38.7;meat;middle_east;turkish
adana;Adana;ramadanids;3;1;35.3;37.0;fibres;middle_east;turkish
maras;Maraş;dulkadir;2;1;36.9;37.6;meat;middle_east;turkish
elbistan;Elbistan;dulkadir;3;1;37.2;38.25;leather;middle_east;turkish
malatya;Malatya;mamluks;2;2;38.3;38.35;grain;middle_east;turkish
erzincan;Erzincan;aqqoyunlu;2;1;39.5;39.7;fibres;middle_east;armenian
erzurum;Erzurum;qaraqoyunlu;3;2;41.25;39.9;meat;middle_east;armenian
kars;Kars;qaraqoyunlu;2;1;43.05;40.6;meat;middle_east;armenian
van;Van;qaraqoyunlu;3;2;43.6;38.4;fish;middle_east;armenian
bitlis;Bitlis;kurds;2;2;42.1;38.4;fibres;middle_east;kurdish
trebizond;Trebizond;trebizond;4;2;39.75;40.85;fibres;middle_east;greek
giresun;Kerasous;trebizond;2;1;38.4;40.8;wood;middle_east;greek
rhodes;Rhodes;hospitallers;2;3;28.0;36.2;produce;middle_east;greek
tbilisi;Kartli;georgia;3;2;44.8;41.7;produce;middle_east;georgian
kutaisi;Imereti;georgia;2;1;42.7;42.25;produce;middle_east;georgian
kakheti;Kakheti;georgia;2;1;45.9;41.85;fibres;middle_east;georgian
yerevan;Yerevan;qaraqoyunlu;2;1;44.5;40.15;grain;middle_east;armenian
karabakh;Karabakh;qaraqoyunlu;2;1;46.7;40.1;iron;middle_east;azeri
shamakhi;Shirvan;shirvan;4;1;48.6;40.65;fibres;middle_east;azeri
derbent;Derbent;shirvan;2;2;48.1;41.95;fish;middle_east;azeri
dagestan;Dagestan;dagestan;1;1;47.0;42.75;fibres;middle_east;dagestani
kabarda;Kabarda;circassia;1;0;43.5;43.6;leather;middle_east;circassian
circassia;Circassia;circassia;1;0;39.3;44.6;wood;middle_east;circassian
diyarbakir;Diyarbakır;aqqoyunlu;5;2;40.2;37.9;fibres;middle_east;kurdish
mardin;Mardin;aqqoyunlu;3;2;40.75;37.3;fibres;middle_east;arab
urfa;Urfa;aqqoyunlu;3;1;38.8;37.15;grain;middle_east;arab
mosul;Mosul;aqqoyunlu;3;1;43.1;36.35;fibres;middle_east;arab
hakkari;Hakkari;kurds;1;1;43.75;37.55;fibres;middle_east;kurdish
erbil;Erbil;qaraqoyunlu;2;0;44.05;36.2;grain;middle_east;kurdish
shahrizor;Shahrizor;kurds;2;1;45.4;35.55;meat;middle_east;kurdish
tikrit;Tikrit;qaraqoyunlu;1;0;43.75;34.6;grain;middle_east;arab
baghdad;Baghdad;qaraqoyunlu;5;2;44.4;33.3;grain;middle_east;arab
hilla;Hilla;qaraqoyunlu;3;0;44.45;32.45;grain;middle_east;arab
wasit;Wasit;qaraqoyunlu;2;0;45.85;32.45;grain;middle_east;arab
basra;Basra;qaraqoyunlu;3;1;47.8;30.55;leather;middle_east;arab
cyprus;Cyprus;cyprus;3;2;32.95;35.0;spices;middle_east;greek
famagusta;Famagusta;genoa;2;2;33.85;35.2;fibres;middle_east;greek
aleppo;Aleppo;mamluks;6;2;37.15;36.2;fibres;middle_east;arab
antioch;Antioch;mamluks;2;1;36.2;36.2;fibres;middle_east;arab
hama;Hama;mamluks;3;1;36.75;35.15;grain;middle_east;arab
trablus;Trablus;mamluks;3;1;35.95;34.4;produce;middle_east;arab
damascus;Damascus;mamluks;6;2;36.3;33.5;dyes;middle_east;arab
safed;Safed;mamluks;2;1;35.45;32.95;fibres;middle_east;arab
jerusalem;Jerusalem;mamluks;3;1;35.2;31.75;produce;middle_east;arab
gaza;Gaza;mamluks;2;0;34.55;31.4;grain;middle_east;arab
karak;Kerak;mamluks;2;2;35.75;31.1;fibres;middle_east;arab
palmyra;Palmyra;bedouins;1;0;38.3;34.6;saltpetre;middle_east;arab
raqqa;Raqqa;mamluks;1;0;39.0;35.95;coal;middle_east;arab
cairo;Cairo;mamluks;8;3;31.25;30.05;grain;north_africa;arab
alexandria;Alexandria;mamluks;5;2;30.1;31.05;fibres;north_africa;arab
damietta;Damietta;mamluks;3;1;31.6;31.2;fish;north_africa;arab
gharbiya;Gharbiya;mamluks;4;0;31.0;30.8;grain;north_africa;arab
fayyum;Fayyum;mamluks;3;0;30.75;29.3;spices;north_africa;arab
minya;Minya;mamluks;3;0;30.75;28.1;grain;north_africa;arab
asyut;Asyut;mamluks;3;0;31.2;27.2;grain;north_africa;arab
qus;Qus;mamluks;3;0;32.75;25.95;spices;north_africa;arab
aswan;Aswan;mamluks;2;1;32.9;24.1;grain;north_africa;nubian
kharga;Western Oases;mamluks;1;0;30.55;25.45;saltpetre;north_africa;arab
siwa;Siwa;tribes;1;0;25.5;29.2;saltpetre;north_africa;berber
marmarica;Marmarica;mamluks;1;0;24.0;31.6;iron;north_africa;arab
barqa;Cyrenaica;mamluks;2;0;21.5;32.5;leather;north_africa;arab
awjila;Awjila;tribes;1;0;21.3;29.1;saltpetre;north_africa;berber
nubia;Nubia;tribes;1;0;30.6;18.6;gold;north_africa;nubian
aidhab;Red Sea Hills;tribes;1;0;35.0;21.5;gold;north_africa;beja
tabriz;Tabriz;qaraqoyunlu;6;2;46.3;38.05;fibres;middle_east;azeri
ardabil;Ardabil;qaraqoyunlu;3;1;48.3;38.25;meat;middle_east;azeri
zanjan;Sultaniyeh;qaraqoyunlu;2;0;48.6;36.6;grain;middle_east;azeri
gilan;Gilan;gilan;3;1;49.6;37.2;fibres;middle_east;persian
mazandaran;Mazandaran;timurids;3;1;52.6;36.45;wood;middle_east;persian
qazvin;Qazvin;qaraqoyunlu;3;0;50.0;36.2;produce;middle_east;persian
rayy;Rayy;qaraqoyunlu;3;0;51.45;35.55;grain;middle_east;persian
hamadan;Hamadan;qaraqoyunlu;3;0;48.5;34.8;fibres;middle_east;persian
kermanshah;Kermanshah;qaraqoyunlu;2;0;47.1;34.3;leather;middle_east;kurdish
luristan;Luristan;qaraqoyunlu;1;1;48.3;33.4;fibres;middle_east;persian
khuzestan;Khuzestan;qaraqoyunlu;2;0;48.7;31.6;spices;middle_east;arab
isfahan;Isfahan;qaraqoyunlu;5;1;51.65;32.65;fibres;middle_east;persian
kashan;Kashan;qaraqoyunlu;3;0;51.45;33.95;dyes;middle_east;persian
yazd;Yazd;qaraqoyunlu;3;0;54.35;31.9;dyes;middle_east;persian
shiraz;Fars;qaraqoyunlu;4;1;52.55;29.6;produce;middle_east;persian
lar;Laristan;qaraqoyunlu;2;0;54.3;27.7;leather;middle_east;persian
kerman;Kerman;qaraqoyunlu;3;1;57.05;30.3;coal;middle_east;persian
hormuz;Hormuz;hormuz;5;2;56.4;27.3;spices;middle_east;persian
mecca;Mecca;mamluks;4;0;39.85;21.45;spices;middle_east;arab
medina;Medina;mamluks;2;0;39.6;24.45;meat;middle_east;arab
tabuk;Tabuk;bedouins;1;0;36.6;28.4;leather;middle_east;arab
asir;Asir;bedouins;1;0;42.5;18.3;meat;middle_east;arab
yemen;Sana'a;yemen;4;2;44.2;15.35;spices;middle_east;arab
zabid;Zabid;yemen;3;1;43.3;14.2;fibres;middle_east;arab
aden;Aden;yemen;3;2;45.0;12.95;spices;middle_east;arab
hadramawt;Hadramawt;hadramawt;2;1;48.9;15.95;spices;middle_east;arab
dhofar;Dhofar;hadramawt;1;0;54.0;17.3;spices;middle_east;arab
muscat;Muscat;oman;2;1;58.4;23.55;fish;middle_east;arab
nizwa;Nizwa;oman;2;1;57.5;22.95;meat;middle_east;arab
sohar;Sohar;hormuz;2;1;56.55;24.25;fish;middle_east;arab
bahrain;Bahrain;hormuz;2;1;50.55;26.05;fish;middle_east;arab
hasa;al-Hasa;bedouins;2;0;49.55;25.4;leather;middle_east;arab
najd;Najd;bedouins;1;0;46.7;24.6;leather;middle_east;arab
hail;Jabal Shammar;bedouins;1;0;41.7;27.5;leather;middle_east;arab
badiya;Syrian Desert;bedouins;1;0;39.5;32.3;leather;middle_east;arab
rubalkhali;Empty Quarter;bedouins;1;0;50.5;20.5;leather;middle_east;arab
fez;Fez;morocco;5;2;-5.0;34.05;fibres;north_africa;maghrebi
tangier;Tangier;morocco;3;1;-5.8;35.5;fish;north_africa;maghrebi
ceuta;Ceuta;portugal;2;3;-5.35;35.85;fish;north_africa;portuguese
rif;Rif;morocco;2;0;-4.0;35.0;wood;north_africa;berber
taza;Taza;morocco;2;1;-4.0;34.15;grain;north_africa;berber
sale;Salé;morocco;3;1;-6.6;33.9;fish;north_africa;maghrebi
doukkala;Doukkala;morocco;2;0;-8.5;32.6;iron;north_africa;maghrebi
marrakesh;Marrakesh;morocco;4;1;-8.0;31.6;spices;north_africa;maghrebi
agadir;Sous;morocco;2;0;-8.9;30.45;spices;north_africa;berber
draa;Draa;tribes;1;0;-6.0;30.3;saltpetre;north_africa;berber
tafilalt;Tafilalt;tribes;2;0;-4.3;31.3;gold;north_africa;berber
saguia;Saguia el-Hamra;tribes;1;0;-11.5;26.8;meat;north_africa;berber
tlemcen;Tlemcen;tlemcen;4;2;-1.3;34.9;fibres;north_africa;maghrebi
oran;Oran;tlemcen;3;1;-0.65;35.6;grain;north_africa;maghrebi
chelif;Chelif;tlemcen;2;0;1.3;36.0;meat;north_africa;maghrebi
algiers;Algiers;tlemcen;3;1;3.05;36.65;fish;north_africa;maghrebi
bejaia;Béjaïa;tunis;3;1;5.0;36.6;wood;north_africa;maghrebi
constantine;Constantine;tunis;3;2;6.6;36.35;coal;north_africa;maghrebi
annaba;Bône;tunis;2;1;7.75;36.8;iron;north_africa;maghrebi
biskra;Zab;tunis;2;0;5.75;34.85;meat;north_africa;berber
tunis;Tunis;tunis;5;2;10.1;36.75;produce;north_africa;maghrebi
kairouan;Kairouan;tunis;3;0;10.1;35.65;grain;north_africa;maghrebi
sfax;Sfax;tunis;2;0;10.5;34.75;produce;north_africa;maghrebi
jerid;Jerid;tunis;2;0;8.4;34.0;saltpetre;north_africa;berber
tripoli;Tripoli;tunis;3;1;13.15;32.8;saltpetre;north_africa;maghrebi
sirte;Sirte;tribes;1;0;16.5;30.6;fibres;north_africa;arab
laghouat;Laghouat;tribes;1;0;2.9;33.8;fibres;north_africa;berber
ouargla;Ouargla;tribes;1;0;5.3;31.95;saltpetre;north_africa;berber
tuat;Tuat;tribes;1;0;0.3;27.9;gold;north_africa;berber
hoggar;Hoggar;tribes;1;0;5.5;23.0;saltpetre;north_africa;berber
fezzan;Fezzan;tribes;1;0;14.4;26.0;saltpetre;north_africa;berber
# eastasia
beijing;Beijing;ming;7;3;116.4;39.9;grain;china;han
baoding;Baoding;ming;4;1;115.5;38.85;grain;china;han
tianjin;Tianjin;ming;4;1;117.2;39.1;saltpetre;china;han
xuanfu;Xuanfu;ming;3;3;115.05;40.6;leather;china;han
zhending;Zhending;ming;4;0;114.55;38.0;fibres;china;han
daming;Daming;ming;4;0;115.0;36.3;fibres;china;han
jinan;Jinan;ming;4;1;117.0;36.65;grain;china;han
yanzhou;Yanzhou;ming;4;0;116.6;35.5;grain;china;han
dengzhou;Dengzhou;ming;3;1;120.0;36.9;fish;china;han
taiyuan;Taiyuan;ming;4;1;112.55;37.85;iron;china;han
datong;Datong;ming;3;3;113.3;40.1;coal;china;han
pingyang;Pingyang;ming;4;0;111.5;36.1;coal;china;han
kaifeng;Kaifeng;ming;4;1;114.35;34.8;grain;china;han
luoyang;Luoyang;ming;4;1;112.45;34.65;grain;china;han
nanyang;Nanyang;ming;3;0;112.5;33.0;grain;china;han
xian;Xi'an;ming;4;2;108.9;34.3;grain;china;han
hanzhong;Hanzhong;ming;3;1;107.0;33.1;grain;china;han
yansui;Yansui;ming;2;3;109.7;37.8;leather;china;han
lanzhou;Lanzhou;ming;3;1;103.8;36.05;leather;china;han
ningxia;Ningxia;ming;2;2;106.25;38.45;leather;china;han
zhangye;Hexi;ming;2;2;100.45;38.95;leather;china;han
chengdu;Chengdu;ming;4;1;104.05;30.65;fibres;china;han
chongqing;Chongqing;ming;4;1;106.55;29.55;grain;china;han
luzhou;Luzhou;ming;3;0;105.45;28.9;saltpetre;china;han
wuhan;Wuchang;ming;4;1;114.3;30.55;grain;china;han
jingzhou;Jingzhou;ming;4;1;112.2;30.35;grain;china;han
xiangyang;Xiangyang;ming;4;1;112.15;32.0;grain;china;han
changsha;Changsha;ming;4;0;112.95;28.2;grain;china;han
hengzhou;Hengzhou;ming;3;0;112.6;26.9;grain;china;han
yuanzhou;Yuanzhou;ming;2;1;109.95;27.55;wood;china;miao
nanchang;Nanchang;ming;4;1;115.9;28.7;grain;china;han
jingdezhen;Jingdezhen;ming;4;0;117.2;29.3;dyes;china;han
ganzhou;Ganzhou;ming;3;1;114.95;25.85;wood;china;han
nanjing;Nanjing;ming;7;3;118.8;32.05;fibres;china;han
suzhou;Suzhou;ming;7;1;120.6;31.3;fibres;china;han
songjiang;Songjiang;ming;5;0;121.25;31.0;fibres;china;han
changzhou;Changzhou;ming;5;0;119.95;31.75;grain;china;han
yangzhou;Yangzhou;ming;5;1;119.45;32.55;saltpetre;china;han
huaian;Huai'an;ming;4;1;119.1;33.55;saltpetre;china;han
xuzhou;Xuzhou;ming;4;1;117.2;34.25;grain;china;han
fengyang;Fengyang;ming;4;1;117.55;32.85;grain;china;han
huizhou;Huizhou;ming;4;0;118.3;29.85;wood;china;han
hangzhou;Hangzhou;ming;7;1;120.15;30.25;fibres;china;han
jiaxing;Jiaxing;ming;5;0;120.45;30.75;fibres;china;han
ningbo;Ningbo;ming;4;1;121.4;29.85;fish;china;han
wenzhou;Wenzhou;ming;4;1;120.65;28.2;fish;china;han
fuzhou;Fuzhou;ming;4;1;119.3;26.1;fish;china;han
quanzhou;Quanzhou;ming;4;1;118.6;24.95;dyes;china;han
zhangzhou;Zhangzhou;ming;4;0;117.65;24.5;spices;china;han
jianning;Jianning;ming;3;0;118.3;27.3;wood;china;han
guangzhou;Guangzhou;ming;5;2;113.25;23.15;fibres;china;han
chaozhou;Chaozhou;ming;4;0;116.6;23.65;spices;china;han
gaozhou;Gaozhou;ming;3;0;110.6;21.65;spices;china;han
hainan;Qiongzhou;ming;2;1;109.8;19.3;saltpetre;china;han
guilin;Guilin;ming;3;1;110.3;25.3;grain;china;han
nanning;Nanning;ming;2;1;108.35;22.8;grain;china;zhuang
guiyang;Guiyang;ming;2;1;106.7;26.6;wood;china;miao
kunming;Kunming;ming;3;1;102.7;25.05;gold;china;han
dali;Dali;ming;3;1;100.2;25.6;leather;china;bai
linan;Lin'an;ming;2;0;102.8;23.65;iron;china;yi
liaoyang;Liaoyang;ming;3;2;123.2;41.3;grain;china;han
guangning;Guangning;ming;2;2;121.8;41.55;leather;china;han
hanseong;Hanseong;korea;6;2;127.0;37.55;grain;china;korean
pyongyang;Pyongyang;korea;4;2;125.75;39.0;iron;china;korean
uiju;Pyongan;korea;2;2;124.9;40.0;wood;china;korean
hamhung;Hamhung;korea;3;1;127.5;39.9;meat;china;korean
gilju;Hamgyong;korea;2;2;129.3;41.2;leather;china;korean
gangneung;Gangwon;korea;2;0;128.6;37.65;fish;china;korean
chungju;Chungcheong;korea;4;0;127.5;36.6;grain;china;korean
jeonju;Jeolla;korea;4;1;127.0;35.5;grain;china;korean
gyeongju;Gyeongju;korea;4;1;129.1;35.9;fibres;china;korean
jinju;Jinju;korea;3;1;128.1;35.2;fibres;china;korean
jeju;Jeju;korea;1;0;126.55;33.38;coal;china;korean
kyoto;Kyoto;japan;6;1;135.75;35.05;fibres;china;japanese
omi;Ōmi;japan;4;1;136.25;35.35;grain;china;japanese
settsu;Settsu;hosokawa;5;1;135.3;34.7;grain;china;japanese
kawachi;Kawachi;hatakeyama;4;1;135.75;34.15;wood;china;japanese
harima;Harima;yamana;4;1;134.7;34.9;saltpetre;china;japanese
tajima;Tajima;yamana;3;2;134.6;35.4;meat;china;japanese
iwami;Iwami;yamana;2;0;132.5;35.0;gold;china;japanese
suo;Suō;ouchi;4;2;131.6;34.15;grain;china;japanese
sanuki;Sanuki;hosokawa;3;0;134.0;34.15;saltpetre;china;japanese
tosa;Tosa;hosokawa;2;0;133.4;33.6;wood;china;japanese
hakata;Hakata;ouchi;4;1;130.5;33.5;fish;china;japanese
bungo;Bungo;otomo;3;2;131.4;33.15;grain;china;japanese
higo;Higo;otomo;3;0;130.8;32.65;grain;china;japanese
hyuga;Hyūga;shimazu;2;0;131.3;32.1;wood;china;japanese
satsuma;Satsuma;shimazu;3;2;130.45;31.65;leather;china;japanese
owari;Owari;shiba;4;1;136.9;35.15;grain;china;japanese
echizen;Echizen;shiba;3;1;136.2;35.95;grain;china;japanese
etchu;Etchū;hatakeyama;2;0;137.2;36.6;grain;china;japanese
kai;Kai;takeda;2;2;138.6;35.65;gold;china;japanese
suruga;Suruga;imagawa;3;1;138.3;35.05;grain;china;japanese
edo;Musashi;uesugi;3;1;139.5;35.8;grain;china;japanese
echigo;Echigo;uesugi;3;1;138.85;37.4;grain;china;japanese
mutsu;Mutsu;date;2;1;140.45;37.75;leather;china;japanese
nanbu;Nanbu;date;1;0;141.15;39.6;leather;china;japanese
oshima;Oshima;natives;1;0;140.45;41.9;fish;china;ainu
ezo;Ezo;natives;1;0;142.8;43.4;leather;china;ainu
ryukyu;Ryukyu;ryukyu;3;1;127.78;26.33;fish;china;ryukyuan
taiwan;Taiwan;natives;1;0;120.9;23.8;leather;china;formosan
karakorum;Khalkha;mongols;1;0;102.8;47.2;leather;china;mongol
kherlen;Kherlen;mongols;1;0;111.0;47.3;leather;china;mongol
chahar;Chahar;mongols;2;0;115.5;42.6;leather;china;mongol
tumed;Tumed;mongols;1;0;111.7;41.0;leather;china;mongol
ordos;Ordos;mongols;1;0;108.3;39.6;leather;china;mongol
uriankhai;Uriankhai;mongols;1;0;120.0;43.5;meat;china;mongol
khovd;Khovd;oirats;2;1;92.0;48.0;leather;china;oirat
dzungaria;Dzungaria;oirats;2;0;86.5;45.5;leather;china;oirat
liaodong;Jianzhou;jurchens;2;1;125.3;41.9;leather;china;jurchen
haixi;Haixi;jurchens;1;0;126.5;44.0;leather;china;jurchen
amur;Yeren;natives;1;0;130.5;46.5;leather;china;jurchen
lhasa;Ü;tibet;3;1;91.1;29.65;fibres;china;tibetan
tsang;Tsang;tibet;2;1;88.9;29.3;fibres;china;tibetan
ngari;Ngari;tibet;1;0;81.5;31.3;gold;china;tibetan
kham;Kham;natives;1;0;97.2;31.15;meat;china;tibetan
amdo;Amdo;natives;1;0;100.5;34.5;leather;china;tibetan
hanoi;Thang Long;daiviet;6;2;105.85;21.0;grain;east_indies;viet
sonnam;Sơn Nam;daiviet;4;0;106.15;20.4;grain;east_indies;viet
thanhhoa;Thanh Hóa;daiviet;3;1;105.6;19.85;grain;east_indies;viet
nghean;Nghệ An;daiviet;3;1;105.4;18.8;wood;east_indies;viet
thuanhoa;Thuận Hóa;daiviet;2;1;107.4;16.45;fish;east_indies;viet
amaravati;Amaravati;champa;2;0;108.1;15.6;spices;east_indies;cham
champa;Vijaya;champa;3;1;108.9;14.0;spices;east_indies;cham
panduranga;Panduranga;champa;2;0;108.7;11.9;fibres;east_indies;cham
angkor;Chaktomuk;khmer;4;1;104.85;11.8;grain;east_indies;khmer
siemreap;Angkor;khmer;2;0;103.85;13.4;grain;east_indies;khmer
preynokor;Prey Nokor;khmer;2;0;105.9;10.3;fish;east_indies;khmer
ayutthaya;Ayutthaya;ayutthaya;6;2;100.55;14.35;grain;east_indies;thai
sukhothai;Sukhothai;ayutthaya;3;1;100.1;16.9;grain;east_indies;thai
korat;Korat;ayutthaya;2;1;102.1;15.0;meat;east_indies;thai
ligor;Ligor;ayutthaya;3;1;99.9;8.4;spices;east_indies;thai
chiangmai;Chiang Mai;lanna;4;1;98.98;18.8;wood;east_indies;thai
chiangrai;Chiang Rai;lanna;2;0;99.85;19.9;grain;east_indies;thai
luangprabang;Luang Prabang;lanxang;3;1;102.15;19.9;gold;east_indies;lao
vientiane;Vientiane;lanxang;3;0;102.6;18.0;grain;east_indies;lao
ava;Ava;ava;4;2;96.0;21.9;grain;east_indies;burmese
toungoo;Toungoo;ava;2;1;96.45;18.95;wood;east_indies;burmese
pegu;Pegu;hanthawaddy;4;1;96.5;17.3;grain;east_indies;mon
martaban;Martaban;hanthawaddy;2;1;97.6;16.5;wood;east_indies;mon
mraukoo;Mrauk U;arakan;3;1;93.2;20.6;grain;east_indies;rakhine
hsenwi;Hsenwi;natives;1;0;97.6;23.0;gold;east_indies;shan
kengtung;Kengtung;natives;1;0;99.6;21.3;wood;east_indies;shan
malacca;Malacca;malacca;5;1;102.35;2.35;spices;east_indies;malay
pahang;Pahang;malacca;2;0;102.8;3.9;gold;east_indies;malay
pasai;Samudera Pasai;pasai;3;1;97.15;5.05;spices;east_indies;malay
minangkabau;Pagaruyung;natives;2;0;100.6;-0.5;gold;east_indies;malay
palembang;Palembang;natives;2;0;104.4;-3.0;spices;east_indies;malay
java;Trowulan;majapahit;5;1;112.4;-7.55;grain;east_indies;javanese
japara;Central Java;majapahit;3;0;110.4;-7.2;spices;east_indies;javanese
sunda;Sunda;sunda;3;1;107.0;-6.9;spices;east_indies;sundanese
brunei;Brunei;brunei;3;1;114.85;4.75;spices;east_indies;malay
banjar;Negara Dipa;natives;2;0;115.0;-2.9;gold;east_indies;malay
borneo;Borneo;natives;1;0;113.5;0.5;wood;east_indies;dayak
makassar;Gowa;natives;1;0;119.7;-5.0;grain;east_indies;bugis
ternate;Ternate;ternate;3;1;127.75;1.0;spices;east_indies;moluccan
tidore;Tidore;tidore;2;0;128.1;0.4;spices;east_indies;moluccan
seram;Seram;natives;1;0;129.5;-3.15;spices;east_indies;moluccan
luzon;Luzon;natives;1;0;121.0;15.5;gold;east_indies;filipino
visayas;Visayas;natives;1;0;123.0;10.2;fish;east_indies;filipino
mindanao;Mindanao;natives;1;0;125.0;7.6;spices;east_indies;filipino
sulu;Sulu;sulu;2;0;121.05;6.0;fish;east_indies;filipino
newguinea;New Guinea;natives;1;0;138.5;-4.0;wood;east_indies;papuan
# rest
agra;Agra;delhi;3;1;78.0;27.2;dyes;india;hindustani
sirhind;Sirhind;delhi;2;0;76.4;30.6;grain;india;hindustani
daulatabad;Daulatabad;bahmani;3;2;75.3;19.9;fibres;india;marathi
berar;Berar;bahmani;2;0;77.6;20.9;fibres;india;marathi
warangal;Telangana;bahmani;3;1;79.6;18.0;fibres;india;telugu
chandragiri;Chandragiri;vijayanagara;2;1;79.0;14.2;fibres;india;telugu
mysore;Mysore;vijayanagara;2;0;76.6;12.6;spices;india;kannada
madurai;Madurai;vijayanagara;3;0;78.1;9.9;fibres;india;tamil
cochin;Cochin;calicut;2;0;76.4;10.0;spices;india;malayali
sonargaon;East Bengal;bengal;3;0;90.4;23.7;fibres;india;bengali
gondwana;Gondwana;natives;1;0;80.5;22.5;wood;india;gondi
djenne;Djenné;mali;3;0;-4.55;13.9;grain;west_africa;manding
kukiya;Kukiya;songhai;2;0;1.0;14.3;grain;west_africa;songhai
ouagadougou;Mossi;mossi;2;1;-1.5;12.4;leather;west_africa;mossi
bono;Bono;natives;1;0;-1.9;7.9;gold;west_africa;akan
oyo;Oyo;oyo;2;1;3.9;8.6;leather;west_africa;yoruba
katsina;Katsina;hausa;2;0;7.6;13.0;fibres;west_africa;hausa
kanem;Kanem;bornu;1;0;15.5;14.0;meat;west_africa;kanuri
soyo;Soyo;kongo;1;0;12.6;-6.4;gold;central_africa;bantu
luba;Luba;natives;1;0;26.5;-8.5;iron;central_africa;bantu
butua;Butua;natives;1;0;29.5;-20.3;gold;southern_africa;bantu
boina;Boina;natives;1;0;46.5;-15.8;meat;southern_africa;malagasy
malindi;Malindi;kilwa;2;0;39.9;-3.0;spices;east_africa;swahili
shewa;Shewa;ethiopia;2;0;39.0;9.2;grain;east_africa;amhara
gojjam;Gojjam;ethiopia;2;0;37.5;10.5;grain;east_africa;amhara
zeila;Zeila;adal;2;0;43.0;10.6;meat;east_africa;somali
mogadishu;Mogadishu;ajuran;3;0;44.6;3.5;meat;east_africa;somali
acadia;Acadia;natives;1;0;-66.5;46.0;fish;north_america;algonquian
hudsonvalley;Hudson Valley;natives;1;0;-74.0;41.8;leather;north_america;algonquian
guale;Georgia;natives;1;0;-83.0;32.5;fibres;north_america;muskogean
appalachia;Appalachia;natives;1;0;-84.0;37.0;leather;north_america;cherokee
puertorico;Puerto Rico;natives;1;0;-66.5;18.25;spices;caribbean;taino
antilles;Lesser Antilles;natives;1;0;-61.65;16.15;spices;caribbean;carib
bahamas;Bahamas;natives;1;0;-78.0;24.4;saltpetre;caribbean;taino
cuernavaca;Cuauhnahuac;aztec;3;0;-99.2;18.6;fibres;mexico;nahua
huasteca;Huasteca;aztec;2;0;-98.5;21.8;fibres;mexico;nahua
tlaxcala;Tlaxcala;tlaxcala;3;2;-98.2;19.3;dyes;mexico;nahua
mixteca;Mixteca;mixtec;3;1;-97.7;17.3;gold;mexico;mixtec
collao;Collao;inca;3;0;-69.8;-15.8;fibres;andes;aymara
lambayeque;Lambayeque;chimor;2;0;-79.8;-6.7;fibres;andes;chimu
muisca;Bacatá;muisca;3;0;-74.1;5.0;gold;andes;muisca
tunja;Tunja;muisca;2;0;-73.35;5.55;gold;andes;muisca
para;Pará;natives;1;0;-48.5;-2.5;wood;brazil;tupi
ceara;Ceará;natives;1;0;-39.5;-5.0;meat;brazil;tupi
espiritosanto;Espírito Santo;natives;1;0;-41.0;-19.5;spices;brazil;tupi
santacatarina;Santa Catarina;natives;1;0;-50.5;-27.0;meat;brazil;guarani
tucuman;Tucumán;natives;1;0;-65.2;-26.8;meat;plata;diaguita
tver;Tver;tver;3;1;35.9;56.85;grain;russia;russian
rostov;Rostov;muscovy;2;0;39.2;57.0;grain;russia;russian
yaroslavl;Yaroslavl;muscovy;2;0;39.9;58.0;wood;russia;russian
vyatka;Vyatka;muscovy;1;0;49.7;58.6;leather;russia;russian
perm;Perm;novgorod;1;0;56.3;60.4;iron;russia;komi
karelia;Karelia;novgorod;1;0;33.5;62.5;leather;russia;karelian
halogaland;Hålogaland;denmark;1;0;15.5;67.5;fish;europe;norwegian
dalarna;Dalarna;sweden;2;0;15.0;60.5;iron;europe;swedish
yenisei;Yenisei;natives;1;0;92.0;58.0;leather;siberia;siberian
baikal;Baikal;natives;1;0;106.0;53.0;leather;siberia;mongol
balkh;Balkh;timurids;3;1;66.9;36.7;coal;central_asia;persian
khwarazm;Khwarazm;timurids;2;0;60.6;41.5;fibres;central_asia;uzbek
kashgar;Kashgar;moghulistan;2;0;76.0;39.5;leather;central_asia;uyghur
ili;Moghulistan;moghulistan;1;0;78.5;43.6;leather;central_asia;chagatai
capeverde;Cape Verde;natives;1;0;-23.6;15.1;saltpetre;west_africa
jolof;Jolof;jolof;2;0;-15.5;15.5;meat;west_africa
timbuktu;Timbuktu;mali;3;0;-3.0;16.8;gold;west_africa
niani;Mali;mali;3;1;-9.0;11.5;gold;west_africa
gao;Songhai;songhai;3;1;0.0;16.3;gold;west_africa
elmina;Gold Coast;natives;1;0;-1.4;6.0;gold;west_africa
benin;Benin;benin;2;1;5.6;6.4;gold;west_africa
kano;Hausa;hausa;3;1;8.5;12.0;fibres;west_africa
bornu;Bornu;bornu;2;1;13.2;12.0;gold;west_africa
kongo;Kongo;kongo;3;1;14.3;-5.0;gold;central_africa
ndongo;Ndongo;natives;1;0;15.5;-9.5;gold;central_africa
lunda;Congo Basin;natives;1;0;22.5;-3.0;gold;central_africa
cape;The Cape;natives;1;0;19.5;-33.0;meat;southern_africa
mutapa;Mutapa;mutapa;2;0;31.0;-17.5;gold;southern_africa
sofala;Sofala;natives;1;0;34.8;-19.8;gold;southern_africa
madagascar;Madagascar;natives;1;0;46.8;-19.0;meat;southern_africa
kilwa;Kilwa;kilwa;3;0;39.3;-8.95;gold;east_africa
mombasa;Mombasa;kilwa;2;0;39.5;-3.5;spices;east_africa
amhara;Amhara;ethiopia;3;1;38.5;11.6;grain;east_africa
tigray;Tigray;ethiopia;2;0;39.0;14.0;meat;east_africa
harar;Adal;adal;2;0;42.1;9.3;meat;east_africa
delhi;Delhi;delhi;5;1;77.2;28.65;fibres;india
lahore;Punjab;delhi;3;0;74.3;31.55;grain;india
jaunpur;Jaunpur;jaunpur;3;0;82.7;25.75;grain;india
gaur;Bengal;bengal;5;0;88.4;24.0;saltpetre;india
ahmedabad;Gujarat;gujarat;4;1;72.6;23.0;dyes;india
mandu;Malwa;malwa;3;1;75.4;22.5;fibres;india
chittor;Mewar;mewar;2;2;74.6;24.9;leather;india
thatta;Sindh;sindh;2;0;68.0;25.5;fibres;india
srinagar;Kashmir;kashmir;2;0;74.8;34.1;fibres;india
bidar;Bahmani;bahmani;4;1;77.5;17.9;fibres;india
goa;Goa;bahmani;2;0;74.0;15.5;spices;india
hampi;Vijayanagara;vijayanagara;5;2;76.5;15.3;gold;india
coromandel;Coromandel;vijayanagara;3;0;79.8;12.5;fibres;india
calicut;Calicut;calicut;3;0;75.8;11.25;spices;india
cuttack;Orissa;orissa;3;1;85.9;20.5;grain;india
kotte;Ceylon;kotte;2;0;80.6;7.3;spices;india
tobolsk;Siberia;natives;1;0;68.25;58.2;leather;siberia
yakutsk;Yakutia;natives;1;0;129.7;62.0;leather;siberia
okhotsk;Far East;natives;1;0;140.0;55.0;leather;siberia
cuba;Cuba;natives;1;0;-79.5;21.8;spices;caribbean
hispaniola;Hispaniola;natives;2;0;-71.0;19.0;spices;caribbean
jamaica;Jamaica;natives;1;0;-77.3;18.1;spices;caribbean
florida;Florida;natives;1;0;-81.7;28.5;leather;north_america
carolina;Carolinas;natives;1;0;-79.5;35.0;fibres;north_america
virginia;Chesapeake;natives;1;0;-77.0;38.0;wood;north_america
newengland;New England;natives;1;0;-71.5;42.5;fish;north_america
quebec;St Lawrence;natives;1;0;-71.5;47.0;leather;north_america
lakes;Great Lakes;natives;1;0;-84.0;44.0;leather;north_america
cahokia;Mississippi;natives;1;0;-90.2;38.6;grain;north_america
plains;Great Plains;natives;1;0;-100.0;41.0;meat;north_america
texas;Texas;natives;1;0;-98.0;31.0;meat;north_america
california;California;natives;1;0;-120.0;37.0;gold;north_america
oregon;Oregon;natives;1;0;-122.5;45.5;wood;north_america
hudson;Hudson Bay;natives;1;0;-95.0;56.0;leather;north_america
alaska;Alaska;natives;1;0;-150.0;63.0;leather;north_america
tenochtitlan;Tenochtitlan;aztec;5;2;-99.1;19.4;gold;mexico
veracruz;Veracruz;aztec;3;0;-96.6;19.2;fibres;mexico
oaxaca;Oaxaca;aztec;3;0;-96.7;17.05;dyes;mexico
michoacan;Michoacán;tarascan;3;1;-101.6;19.6;gold;mexico
chichimeca;Chichimeca;natives;1;0;-103.0;24.0;gold;mexico
yucatan;Yucatán;maya;2;0;-89.0;20.5;fibres;mexico
guatemala;Guatemala;maya;2;0;-90.5;15.0;dyes;mexico
panama;Panama;natives;1;0;-80.0;8.5;gold;andes
venezuela;Venezuela;natives;1;0;-67.0;9.0;meat;andes
quito;Quito;natives;3;1;-78.5;-0.2;gold;andes
chanchan;Chimor;chimor;3;1;-78.0;-8.5;fibres;andes
cusco;Cusco;inca;5;2;-72.0;-13.5;gold;andes
potosi;Charcas;inca;2;0;-65.75;-19.6;gold;andes
chile;Chile;natives;1;0;-71.0;-34.0;gold;andes
guiana;Guiana;natives;1;0;-57.0;5.0;spices;brazil
pernambuco;Pernambuco;natives;1;0;-36.5;-8.0;dyes;brazil
bahia;Bahia;natives;1;0;-40.0;-12.5;spices;brazil
rio;Rio de Janeiro;natives;1;0;-43.5;-22.5;spices;brazil
saopaulo;São Paulo;natives;1;0;-47.5;-23.0;meat;brazil
amazon;Amazonia;natives;1;0;-60.0;-4.0;wood;brazil
paraguay;Paraguay;natives;1;0;-57.5;-24.0;meat;plata
plata;Río de la Plata;natives;1;0;-60.0;-33.5;meat;plata
patagonia;Patagonia;natives;1;0;-68.0;-44.0;meat;plata
sydney;New South Wales;natives;1;0;150.0;-31.0;meat;oceania
perth;Western Australia;natives;1;0;117.0;-28.0;gold;oceania
outback;Australia;natives;1;0;134.0;-24.0;meat;oceania
newzealand;New Zealand;natives;1;0;175.0;-39.0;wood;oceania
walata;Walata;mali;2;0;-7.0;17.5;saltpetre;west_africa;manding
diara;Diara;mali;2;0;-9.5;14.8;grain;west_africa;manding
bambuk;Bambuk;mali;2;0;-11.3;13.3;gold;west_africa;manding
segou;Ségou;mali;2;0;-6.3;13.3;grain;west_africa;manding
kaabu;Kaabu;mali;2;1;-15.0;12.3;produce;west_africa;manding
wuli;Wuli;mali;1;0;-14.2;13.6;grain;west_africa;manding
wasulu;Wasulu;mali;1;0;-7.5;10.0;gold;west_africa;manding
macina;Macina;mali;2;0;-5.3;15.4;meat;west_africa;fulani
waalo;Waalo;jolof;1;0;-15.4;17.1;meat;west_africa;wolof
saloum;Saloum;jolof;2;0;-16.0;14.0;fish;west_africa;wolof
futatoro;Futa Toro;natives;1;0;-13.6;16.0;grain;west_africa;fulani
hombori;Hombori;songhai;1;0;-1.6;15.3;meat;west_africa;songhai
zarma;Zarma;songhai;1;0;2.7;13.6;grain;west_africa;songhai
dendi;Dendi;songhai;1;0;3.0;11.3;grain;west_africa;songhai
zaria;Zaria;hausa;2;0;7.7;10.5;fibres;west_africa;hausa
gobir;Gobir;hausa;2;0;6.0;13.8;leather;west_africa;hausa
zamfara;Zamfara;hausa;1;0;6.2;12.2;dyes;west_africa;hausa
daura;Daura;hausa;1;0;9.6;13.3;fibres;west_africa;hausa
kawar;Kawar;bornu;1;0;12.9;18.7;saltpetre;west_africa;kanuri
manga;Manga;bornu;1;0;11.5;13.3;meat;west_africa;kanuri
kotoko;Kotoko;bornu;1;0;15.0;11.8;fish;west_africa;kanuri
mandara;Mandara;bornu;1;0;13.8;10.2;iron;west_africa
wadai;Wadai;natives;1;0;20.5;13.0;meat;west_africa
ife;Ife;ife;3;0;4.0;7.0;produce;west_africa;yoruba
owo;Owo;benin;2;0;5.6;8.0;produce;west_africa;edo
allada;Allada;natives;1;0;2.4;6.9;produce;west_africa
nupe;Nupe;natives;2;0;6.3;9.5;fibres;west_africa
igbo;Igboland;natives;1;0;7.5;6.0;wood;west_africa
wassa;Wassa;natives;1;0;-3.0;6.2;gold;west_africa;akan
nsundi;Nsundi;kongo;2;0;14.5;-3.4;iron;central_africa;bantu
mbata;Mbata;kongo;2;0;15.9;-5.4;fibres;central_africa;bantu
mpemba;Mpemba;kongo;2;0;14.8;-6.8;iron;central_africa;bantu
mbamba;Mbamba;kongo;1;0;13.6;-7.9;saltpetre;central_africa;bantu
ngoyo;Ngoyo;kongo;1;0;12.2;-4.7;fish;central_africa;bantu
teke;Tio;natives;1;0;16.0;-2.0;fibres;central_africa;bantu
yaka;Kwango;natives;1;0;18.0;-6.5;wood;central_africa;bantu
ovimbundu;Ovimbundu;natives;1;0;15.5;-12.5;meat;central_africa;bantu
katanga;Katanga;natives;1;0;27.5;-11.5;iron;central_africa;bantu
greatzimbabwe;Great Zimbabwe;mutapa;2;1;31.3;-20.6;gold;southern_africa;bantu
manyika;Manyika;mutapa;1;0;32.6;-18.8;gold;southern_africa;bantu
dande;Dande;mutapa;1;0;30.6;-15.8;meat;southern_africa;bantu
guruuswa;Guruuswa;mutapa;1;0;29.0;-18.0;meat;southern_africa;bantu
mapungubwe;Mapungubwe;natives;1;0;29.4;-22.2;gold;southern_africa;bantu
begemder;Begemder;ethiopia;2;0;37.3;12.8;grain;east_africa;amhara
damot;Damot;ethiopia;2;0;37.0;8.6;grain;east_africa;amhara
hadiya;Hadiya;ethiopia;1;0;38.0;7.2;meat;east_africa
bale;Bale;ethiopia;1;0;40.0;7.0;meat;east_africa
ifat;Ifat;ethiopia;2;0;40.4;10.4;produce;east_africa
dawaro;Dawaro;ethiopia;1;0;41.0;8.2;meat;east_africa
medribahri;Medri Bahri;ethiopia;2;0;38.6;15.6;meat;east_africa;amhara
lasta;Lasta;ethiopia;2;0;39.8;12.6;grain;east_africa;amhara
berbera;Berbera;adal;2;0;45.0;10.0;meat;east_africa;somali
aussa;Aussa;adal;1;0;41.5;11.5;saltpetre;east_africa
ogaden;Ogaden;adal;1;0;44.0;7.5;meat;east_africa;somali
barawa;Barawa;ajuran;2;0;43.8;1.4;spices;east_africa;somali
zanzibar;Zanzibar;kilwa;2;0;39.3;-6.1;spices;east_africa;swahili
pate;Pate;pate;2;0;41.1;-1.9;spices;east_africa;swahili
mozambique;Mozambique;kilwa;1;0;40.4;-15.0;gold;east_africa;swahili
quelimane;Quelimane;kilwa;1;0;36.7;-17.6;gold;southern_africa;swahili
comoros;Comoros;kilwa;1;0;43.3;-11.7;spices;east_africa;swahili
kikuyu;Kikuyu;natives;1;0;37.0;-0.7;meat;east_africa;bantu
rwanda;Rwanda;natives;1;0;29.9;-2.0;meat;east_africa;bantu
maravi;Maravi;natives;1;0;34.5;-13.5;iron;east_africa;bantu
tepecuacuilco;Tepecuacuilco;aztec;2;0;-100.2;17.4;gold;mexico;nahua
xilotepec;Xilotepec;aztec;2;0;-100.0;20.8;grain;mexico;otomi
totonacapan;Totonacapan;aztec;2;0;-97.35;20.55;spices;mexico;totonac
zacatula;Zacatula;tarascan;2;0;-101.9;18.0;fibres;mexico;purepecha
campeche;Campeche;maya;2;0;-90.3;19.2;fish;mexico;maya
ecab;Ecab;maya;2;0;-87.5;20.9;fish;mexico;maya
chetumal;Chetumal;maya;2;0;-88.7;18.6;spices;mexico;maya
tayasal;Petén Itzá;maya;2;1;-89.9;17.0;wood;mexico;maya
tehuantepec;Tehuantepec;zapotec;3;1;-95.2;16.4;fibres;mexico;zapotec
xicalango;Xicalango;natives;2;0;-92.6;18.2;spices;mexico;maya
soconusco;Soconusco;natives;2;0;-92.3;15.0;spices;mexico;maya
cuscatlan;Cuzcatlán;natives;2;0;-89.2;13.8;spices;mexico;nahua
bayamo;Bayamo;natives;1;0;-76.6;20.4;grain;caribbean;taino
higuey;Higüey;natives;1;0;-68.7;18.6;fish;caribbean;taino
xaragua;Xaraguá;natives;2;0;-72.55;18.4;fibres;caribbean;taino
trinidad;Trinidad;natives;1;0;-61.3;10.5;spices;caribbean;arawak
andahuaylas;Andahuaylas;inca;2;0;-73.6;-13.6;grain;andes;quechua
angaraes;Angaraes;inca;2;0;-74.9;-12.4;meat;andes;quechua
xauxa;Hatun Xauxa;inca;3;0;-75.5;-11.0;grain;andes;quechua
arequipa;Arequipa;inca;2;0;-71.5;-16.4;produce;andes;quechua
pacajes;Pacajes;inca;2;0;-68.3;-16.9;meat;andes;aymara
antisuyu;Antisuyu;inca;1;1;-70.8;-12.2;spices;andes;arawak
canchis;Canas y Canchis;inca;2;0;-70.9;-14.65;fibres;andes;quechua
parinacochas;Parinacochas;inca;2;0;-72.8;-15.2;gold;andes;quechua
piura;Piura;chimor;2;0;-80.5;-5.2;fibres;andes;chimu
tumbes;Tumbes;chimor;2;0;-80.3;-3.7;fish;andes;chimu
paramonga;Paramonga;chimor;2;1;-77.7;-10.4;produce;andes;chimu
cajamarca;Cajamarca;natives;2;0;-78.2;-6.9;grain;andes;quechua
chincha;Chincha;natives;2;0;-75.9;-13.7;fish;andes;quechua
tairona;Tairona;natives;2;0;-73.8;10.8;gold;andes;tairona
coquimbo;Coquimbo;natives;1;0;-71.0;-30.0;produce;andes;diaguita
huillimapu;Huillimapu;natives;1;0;-72.9;-40.8;grain;andes;mapuche
maranhao;Maranhão;natives;1;0;-44.5;-4.0;produce;brazil;tupi
minasgerais;Minas Gerais;natives;1;0;-44.5;-18.0;gold;brazil;ge
guaira;Guairá;natives;1;0;-52.5;-24.5;produce;brazil;guarani
iroquoia;Iroquoia;natives;2;0;-76.2;42.9;leather;north_america;iroquois
hochelaga;Hochelaga;natives;1;0;-73.6;45.5;grain;north_america;iroquois
huronia;Wendake;natives;2;0;-79.6;44.8;wood;north_america;iroquois
fortancient;Ohio Valley;natives;1;0;-83.0;40.0;grain;north_america;mississippian
moundville;Moundville;natives;2;0;-87.6;33.0;grain;north_america;mississippian
natchez;Natchez;natives;2;0;-91.3;31.5;produce;north_america;mississippian
caddo;Caddo;natives;1;0;-94.6;35.0;produce;north_america;caddo
calusa;Calusa;natives;1;0;-81.4;26.3;fish;north_america;calusa
pugetsound;Puget Sound;natives;1;0;-122.0;47.5;fish;north_america;salish
cibola;Cíbola;natives;1;0;-108.8;35.1;grain;north_america;pueblo
quivira;Quivira;natives;1;0;-98.0;38.0;meat;north_america;plains
sandomierz;Sandomierz;poland;3;1;21.4;50.6;grain;europe
lublin;Lublin;poland;3;0;23.0;51.4;grain;europe
sieradz;Sieradz;poland;2;0;19.2;51.35;grain;europe
kuyavia;Kuyavia;poland;2;0;18.6;52.35;grain;europe
kamieniec;Podolia;poland;2;1;26.6;48.7;grain;europe;ruthenian
halych;Halych;poland;2;0;24.9;48.9;saltpetre;europe;ruthenian
grodno;Grodno;lithuania;2;1;24.0;53.75;wood;europe;ruthenian
berestye;Brest;lithuania;2;1;24.2;52.2;grain;europe;ruthenian
samogitia;Samogitia;lithuania;1;0;22.5;55.7;leather;europe
polotsk;Polotsk;lithuania;3;1;28.4;55.8;wood;russia;ruthenian
vitebsk;Vitebsk;lithuania;2;0;30.2;55.2;fibres;russia;ruthenian
pinsk;Pinsk;lithuania;1;0;26.1;52.1;wood;europe;ruthenian
chernigov;Chernigov;lithuania;2;0;31.3;51.5;grain;russia;ruthenian
bryansk;Bryansk;lithuania;2;0;34.0;53.2;wood;russia;russian
braclaw;Bracław;lithuania;1;0;28.8;48.8;grain;russia;ruthenian
cherkasy;Cherkasy;lithuania;1;0;32.0;49.4;grain;russia;ruthenian
kulm;Kulm;teutonic;3;1;18.9;53.35;grain;europe
courland;Courland;teutonic;1;0;22.0;56.8;grain;europe;baltic
dorpat;Dorpat;teutonic;2;1;26.7;58.4;grain;europe;baltic
reval;Reval;teutonic;2;1;24.75;59.0;fish;europe;baltic
ingria;Ingria;novgorod;1;0;29.0;59.5;fish;russia;karelian
onega;Onega;novgorod;1;0;35.8;61.0;wood;russia;karelian
kola;Kola;novgorod;1;0;38.0;68.8;fish;russia;karelian
pechora;Pechora;novgorod;1;0;55.0;64.8;leather;russia;komi
vladimir;Vladimir;muscovy;3;1;40.4;56.15;grain;russia
galich;Galich;muscovy;2;0;42.35;58.35;leather;russia
kaluga;Kaluga;muscovy;2;0;35.9;54.55;grain;russia
beloozero;Beloozero;muscovy;1;0;37.8;60.0;fish;russia
ustyug;Ustyug;muscovy;1;0;46.3;60.8;leather;russia
kashin;Kashin;tver;2;0;37.4;57.5;grain;russia
hajjitarkhan;Astrakhan;horde;2;0;48.0;46.35;fish;russia
ukek;Ukek;horde;1;0;46.0;51.5;leather;russia
lowerdon;Lower Don;horde;1;0;42.0;48.5;meat;russia
saraichik;Saraichik;horde;1;0;51.5;47.5;meat;russia
bashkiria;Bashkiria;horde;1;0;56.0;54.5;leather;russia
azov;Azov;horde;2;0;39.4;47.1;fish;russia
perekop;Perekop;crimea;1;1;33.8;46.2;meat;russia
dniepersteppe;Dnieper Steppe;crimea;1;0;35.5;47.0;meat;russia
kaffa;Kaffa;genoa;4;2;35.6;45.2;fibres;russia;greek
cheremis;Cheremis;kazan;1;0;47.5;56.6;wood;russia;komi
bulgar;Bulgar;kazan;2;0;49.5;54.4;grain;russia
barlad;Lower Moldavia;moldavia;2;0;27.7;46.2;grain;europe
akkerman;Akkerman;moldavia;2;1;30.0;46.3;fish;europe
kondavidu;Kondavidu;vijayanagara;3;2;80.1;16.3;fibres;india;telugu
udayagiri;Udayagiri;vijayanagara;2;2;79.7;15.3;grain;india;telugu
penukonda;Penukonda;vijayanagara;2;2;77.6;14.1;grain;india;telugu
tanjore;Tanjore;vijayanagara;4;1;79.1;10.8;grain;india;tamil
tirunelveli;Tirunelveli;vijayanagara;2;0;77.7;8.7;fibres;india;tamil
coimbatore;Kongu;vijayanagara;2;0;77.0;11.0;meat;india;tamil
tulunadu;Tulu Nadu;vijayanagara;2;0;75.0;12.9;spices;india;kannada
raichur;Raichur;bahmani;3;2;77.35;16.2;grain;india;kannada
gulbarga;Gulbarga;bahmani;4;1;76.5;17.2;grain;india;kannada
bijapur;Bijapur;bahmani;3;1;75.4;16.6;fibres;india;kannada
dabhol;Dabhol;bahmani;3;0;73.3;17.8;fish;india;konkani
junnar;Junnar;bahmani;2;1;73.9;19.2;grain;india;marathi
nanded;Nanded;bahmani;2;0;77.3;19.15;fibres;india;marathi
golconda;Golconda;bahmani;3;2;78.4;17.4;gold;india;telugu
rajahmundry;Rajahmundry;orissa;3;1;81.8;17.0;grain;india;telugu
kalinga;Kalinga;orissa;2;0;83.8;18.6;fish;india;oriya
balasore;Balasore;orissa;2;0;86.6;21.6;fish;india;oriya
satgaon;Satgaon;bengal;4;0;88.4;22.9;fibres;india;bengali
chittagong;Chittagong;bengal;3;1;91.8;22.4;fish;india;bengali
sylhet;Sylhet;bengal;2;0;91.8;24.9;produce;india;bengali
khalifatabad;Khalifatabad;bengal;2;0;89.6;22.8;wood;india;bengali
purnea;Purnea;bengal;2;0;87.5;25.8;saltpetre;india;bengali
patna;Bihar;jaunpur;3;1;85.2;25.6;saltpetre;india;hindustani
awadh;Awadh;jaunpur;3;0;82.2;26.8;grain;india;hindustani
kanauj;Kanauj;jaunpur;3;1;80.0;27.1;produce;india;hindustani
sambhal;Sambhal;delhi;2;0;78.6;28.6;grain;india;hindustani
mewat;Mewat;delhi;2;1;76.6;27.6;leather;india;hindustani
hisar;Hisar;delhi;2;1;75.7;29.2;meat;india;hindustani
dipalpur;Dipalpur;delhi;2;1;73.8;30.6;grain;india;punjabi
jalandhar;Jalandhar;delhi;2;0;75.6;31.3;produce;india;punjabi
patan;Patan;gujarat;3;1;71.9;24.0;fibres;india;gujarati
baroda;Baroda;gujarat;3;0;73.5;22.3;fibres;india;gujarati
surat;Surat;gujarat;2;0;72.9;21.2;fish;india;gujarati
ujjain;Ujjain;malwa;3;1;76.0;23.6;produce;india;hindustani
raisen;Raisen;malwa;2;2;77.7;23.4;grain;india;hindustani
chanderi;Chanderi;malwa;3;2;78.1;24.7;fibres;india;hindustani
ajmer;Ajmer;mewar;3;2;74.6;26.45;meat;india;rajput
bundi;Hadoti;mewar;2;1;75.8;25.4;grain;india;rajput
mandore;Mandore;mewar;2;1;73.0;26.3;leather;india;rajput
bhakkar;Bhakkar;sindh;2;1;68.9;27.7;grain;india;sindhi
multan;Multan;multan;4;1;71.5;30.2;fibres;india;punjabi
baltistan;Baltistan;kashmir;1;0;75.6;35.3;gold;india;tibetan
jaffna;Jaffna;kotte;2;1;80.3;9.25;fish;india;tamil
gwalior;Gwalior;gwalior;3;2;78.2;26.0;produce;india;rajput
kathmandu;Nepal;nepal;3;1;85.3;27.7;produce;india;nepali
khandesh;Khandesh;khandesh;2;1;76.2;21.3;fibres;india;marathi
jaisalmer;Jaisalmer;natives;1;1;70.9;26.9;leather;india;rajput
kumaon;Kumaon;natives;1;0;79.6;29.6;wood;india;hindustani
ladakh;Ladakh;natives;1;0;77.6;34.2;meat;india;tibetan
kamata;Kamata;natives;2;1;89.4;26.3;grain;india;bengali
ahom;Ahom;natives;2;1;94.6;26.9;wood;india;shan
tripura;Tripura;natives;1;0;91.6;23.5;wood;india;bengali
jharkhand;Jharkhand;natives;1;0;85.3;23.4;iron;india;gondi
chanda;Chanda;natives;1;1;79.3;19.9;wood;india;gondi
bastar;Bastar;natives;1;0;81.9;19.1;wood;india;gondi
junagadh;Saurashtra;natives;3;2;70.6;21.5;produce;india;gujarati
gallipoli;Gallipoli;ottomans;3;2;26.65;40.4;fish;europe;turkish
plovdiv;Filibe;ottomans;3;0;24.75;42.15;grain;europe;bulgarian
vidin;Vidin;ottomans;2;1;22.9;43.95;grain;europe;bulgarian
tarnovo;Tarnovo;ottomans;2;1;25.6;43.1;meat;europe;bulgarian
varna;Varna;ottomans;2;1;27.6;43.0;fish;europe;bulgarian
dobruja;Dobruja;ottomans;1;1;28.0;44.25;meat;europe;tatar
skopje;Üsküp;ottomans;3;1;21.45;42.0;meat;europe;serbian
monastir;Monastir;ottomans;2;0;21.0;40.95;grain;europe;bulgarian
ioannina;Epirus;ottomans;2;1;20.85;39.65;meat;europe;greek
gumulcine;Gümülcine;ottomans;2;0;25.4;41.15;grain;europe;greek
menteshe;Menteşe;ottomans;2;1;29.0;36.9;fish;middle_east;turkish
canik;Canik;ottomans;2;1;36.9;41.3;grain;middle_east;turkish
corum;Çorum;ottomans;2;0;34.6;40.3;grain;middle_east;turkish
nigde;Niğde;karaman;2;1;34.7;37.95;meat;middle_east;turkish
silifke;İçel;karaman;2;1;33.9;36.4;wood;middle_east;turkish
aksehir;Akşehir;karaman;2;0;31.35;38.55;grain;middle_east;turkish
kharput;Kharput;aqqoyunlu;2;1;39.35;38.6;grain;middle_east;armenian
jazira;Jazira;aqqoyunlu;2;1;42.2;37.3;grain;middle_east;kurdish
sinjar;Sinjar;aqqoyunlu;1;1;41.85;36.3;meat;middle_east;kurdish
urmia;Urmia;qaraqoyunlu;3;1;45.05;37.55;produce;middle_east;azeri
nakhchivan;Nakhchivan;qaraqoyunlu;2;1;45.4;39.2;produce;middle_east;armenian
semnan;Semnan;qaraqoyunlu;2;0;53.4;35.6;grain;middle_east;persian
qom;Qom;qaraqoyunlu;3;0;50.4;34.9;produce;middle_east;persian
bakhtiari;Bakhtiari;qaraqoyunlu;1;1;50.0;32.0;leather;middle_east;persian
darab;Darab;qaraqoyunlu;2;0;54.3;29.0;produce;middle_east;persian
bam;Bam;qaraqoyunlu;2;1;58.35;29.1;produce;middle_east;persian
samawa;Samawa;qaraqoyunlu;1;0;45.3;31.3;produce;middle_east;arab
ardalan;Ardalan;kurds;2;1;46.9;35.6;meat;middle_east;kurdish
astarabad;Astarabad;timurids;3;1;54.45;36.85;fibres;middle_east;persian
nishapur;Nishapur;timurids;3;1;58.2;36.0;grain;central_asia;persian
merv;Merv;timurids;2;1;61.85;37.6;fibres;central_asia;persian
tashkent;Tashkent;timurids;3;1;69.25;41.3;grain;central_asia;uzbek
ferghana;Ferghana;timurids;3;1;71.8;40.6;fibres;central_asia;uzbek
kabul;Kabul;timurids;3;1;69.2;34.55;produce;central_asia;persian
ghazni;Ghazni;timurids;2;1;68.2;33.4;leather;central_asia;pashtun
badakhshan;Badakhshan;badakhshan;2;1;70.8;37.0;dyes;central_asia;persian
sistan;Sistan;sistan;2;1;61.5;31.0;grain;middle_east;persian
roh;Roh;tribes;1;0;69.5;31.5;meat;central_asia;pashtun
baluchistan;Baluchistan;tribes;1;0;66.8;29.5;leather;central_asia;baluch
makran;Makran;tribes;1;0;61.5;26.5;produce;middle_east;baluch
sighnaq;Sighnaq;uzbeks;2;1;68.3;43.3;leather;central_asia;uzbek
mingrelia;Mingrelia;georgia;2;1;41.6;42.6;wood;middle_east;georgian
shaki;Shaki;shirvan;2;1;47.2;41.2;fibres;middle_east;azeri
baku;Baku;shirvan;2;1;49.85;40.4;coal;middle_east;azeri
najran;Najran;bedouins;1;0;44.6;17.6;produce;middle_east;arab
qassim;Qassim;bedouins;1;0;43.9;26.3;produce;middle_east;arab
jawf;al-Jawf;bedouins;1;0;39.9;29.8;produce;middle_east;arab
jaalan;Ja'alan;oman;1;0;59.0;22.0;fish;middle_east;arab
julfar;Julfar;hormuz;2;0;55.95;25.6;fish;middle_east;arab
rada;Rada';yemen;2;1;45.5;14.2;grain;middle_east;arab
nantes;Nantes;brittany;3;1;-1.95;47.1;produce;europe
vannes;Vannes;brittany;2;0;-3.1;47.75;fish;europe
saintes;Saintonge;france;2;0;-0.8;45.85;produce;europe
rodez;Rouergue;france;2;0;2.5;44.45;meat;europe;occitan
privas;Vivarais;france;2;0;4.3;44.7;wood;europe;occitan
perigueux;Périgord;france;2;0;0.85;44.85;produce;europe;occitan
tarbes;Bigorre;france;1;0;0.2;43.1;meat;europe;occitan
narbonne;Narbonne;france;2;0;2.75;43.15;produce;europe;occitan
alencon;Maine;france;2;0;0.4;48.4;grain;europe
troyes;Troyes;france;3;0;4.75;48.3;fibres;europe
nancy;Lorraine;france;3;1;6.2;48.65;saltpetre;europe
auxerre;Auxerre;burgundy;2;0;3.6;47.75;produce;europe
charolles;Charolais;burgundy;2;0;4.1;46.55;meat;europe
nijmegen;Guelders;burgundy;2;0;6.2;51.8;grain;europe;german
colmar;Alsace;austria;3;0;7.5;48.3;produce;europe;german
nice;Nice;savoy;2;1;7.2;43.8;fish;europe
linz;Upper Austria;austria;3;0;14.3;48.3;grain;europe
klagenfurt;Carinthia;austria;2;0;14.0;46.95;iron;europe
ravensburg;Upper Swabia;austria;2;0;10.1;47.9;fibres;europe;german
salzburg;Salzburg;bavaria;3;1;13.0;47.6;saltpetre;europe
plzen;Pilsen;bohemia;2;0;13.0;49.75;grain;europe
budweis;South Bohemia;bohemia;2;0;15.0;49.1;fish;europe
opava;Upper Silesia;bohemia;2;0;18.0;50.0;iron;europe;silesian
cottbus;Lusatia;bohemia;2;0;14.6;51.8;fibres;europe;german
zwickau;Vogtland;saxony;2;0;12.3;50.55;gold;europe
magdeburg;Magdeburg;saxony;3;1;11.7;52.0;grain;europe
stendal;Altmark;brandenburg;2;0;11.8;53.0;grain;europe
ansbach;Ansbach;brandenburg;2;0;10.5;49.6;grain;europe
schleswig;Schleswig;denmark;2;0;9.3;54.7;meat;europe
rostock;Rostock;hansa;3;0;12.3;54.0;grain;europe
arnsberg;Westphalia;cologne;2;0;8.1;51.6;iron;europe
munster;Münster;cologne;2;0;7.3;52.45;leather;europe
oldenburg;Oldenburg;denmark;2;0;8.1;53.35;meat;europe;german
chur;Grisons;swiss;1;0;10.0;46.6;meat;europe
kassa;Kassa;hungary;3;1;21.3;48.6;gold;europe;slovak
osijek;Slavonia;hungary;2;0;18.6;45.7;grain;europe;croatian
nagyvarad;Várad;hungary;3;0;21.9;47.05;grain;europe
veszprem;Transdanubia;hungary;3;0;17.3;46.8;produce;europe
szekely;Székely Land;hungary;2;0;25.3;46.4;wood;europe
sibiu;Hermannstadt;hungary;3;1;24.15;45.8;fibres;europe;german
hunyad;Hunyad;hungary;2;2;22.7;45.6;iron;europe;romanian
senj;Senj;hungary;2;0;14.9;45.0;wood;europe;croatian
banjaluka;Donji Kraji;bosnia;1;0;17.3;44.9;wood;europe
blagaj;Hum;bosnia;2;1;17.5;43.05;produce;europe
zeta;Zeta;serbia;1;1;19.2;42.6;meat;europe
berat;Berat;albania;1;0;20.0;40.6;produce;europe
patras;Achaea;byzantium;2;0;21.75;38.0;produce;europe
braila;Brăila;wallachia;2;0;27.5;45.0;fish;europe
foggia;Capitanata;naples;2;0;15.5;41.5;grain;europe
potenza;Basilicata;naples;1;0;15.6;40.3;meat;europe
lecce;Terra d'Otranto;naples;2;0;18.0;40.3;produce;europe
udine;Friuli;venice;2;0;13.1;46.25;produce;europe
visby;Gotland;denmark;2;1;18.5;57.45;fish;europe;swedish
kalmar;Småland;sweden;2;1;15.9;56.9;wood;europe
linkoping;Östergötland;sweden;2;0;15.9;58.4;grain;europe
halsingland;Hälsingland;sweden;1;0;17.25;61.75;wood;europe
ostrobothnia;Ostrobothnia;sweden;1;0;23.5;63.0;fish;europe;finnish
tavastia;Tavastia;sweden;1;0;25.2;61.5;wood;europe;finnish
vyborg;Viborg;sweden;2;2;28.75;60.7;fish;europe;finnish
jamtland;Jämtland;denmark;1;0;14.0;63.0;leather;europe;norwegian
more;Møre;denmark;1;0;7.6;62.55;fish;europe;norwegian
agder;Agder;denmark;1;0;8.2;58.6;wood;europe;norwegian
aberdeen;Aberdeen;scotland;2;0;-2.5;57.2;fish;europe
isles;The Isles;scotland;1;0;-6.3;57.2;fish;europe
sutherland;Sutherland;scotland;1;0;-4.2;58.3;meat;europe
orkney;Orkney;denmark;1;0;-3.0;59.0;fish;europe;norwegian
kilkenny;Ormond;ireland;2;0;-7.35;52.6;meat;europe
donegal;Tyrconnell;ireland;1;0;-8.4;54.95;meat;europe
truro;Cornwall;england;2;0;-5.0;50.35;iron;europe
caernarfon;Gwynedd;england;1;0;-4.0;53.0;meat;europe
lincoln;Lincoln;england;3;0;-0.4;53.1;fibres;europe
forcalquier;Forcalquier;france;2;0;6.1;44.3;produce;europe;occitan
cotentin;Cotentin;france;2;0;-1.8;49.6;meat;europe
macso;Macsó;hungary;2;1;19.5;44.7;grain;europe;serbian
szeged;Szeged;hungary;2;0;19.9;46.5;meat;europe
carlisle;Cumberland;england;1;1;-3.4;54.75;meat;europe
shetland;Shetland;denmark;1;0;-1.25;60.35;fish;europe;norwegian
bohuslan;Bohuslän;denmark;1;0;11.6;58.4;fish;europe;norwegian
`;

export interface ProvinceSeed {
  id: string; name: string; owner: string; dev: number; fort: number; lon: number; lat: number; good: string; region: string;
  culture?: string; // optional: overrides the owner's culture
}

export function parseTable(t: string): ProvinceSeed[] {
  return t.trim().split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const [id, name, owner, dev, fort, lon, lat, good, region, culture] = l.split(';').map(x => x.trim());
    return { id, name, owner, dev: +dev, fort: +fort, lon: +lon, lat: +lat, good, region, ...(culture ? { culture } : {}) };
  });
}

export const SEEDS_EUROPE = () => parseTable(TABLE);
export const SEEDS_WORLD_EXTRA = () => parseTable(TABLE_WORLD);
