// World provinces in 1453. One line each:
// id;Name;owner;development;fort;lon;lat;raw material;discovery region[;culture]
// Regions marked as known at the start are listed in KNOWN_REGIONS.

export const KNOWN_REGIONS = ['europe', 'north_africa', 'middle_east', 'atlantic', 'russia', 'central_asia'];

const TABLE = `
coruna;A Coruña;castile;2;0;-8.4;43.3;fish;europe
santiago;Santiago;castile;3;0;-8.5;42.75;cattle;europe
lugo;Lugo;castile;2;0;-7.55;43.0;cattle;europe
ourense;Ourense;castile;2;0;-7.85;42.3;wine;europe
oviedo;Oviedo;castile;2;0;-5.85;43.35;iron;europe
santander;Santander;castile;2;0;-4.0;43.25;fish;europe
bilbao;Biscay;castile;3;0;-2.95;43.2;iron;europe
sansebastian;Gipuzkoa;castile;2;0;-2.1;43.15;iron;europe
vitoria;Álava;castile;2;0;-2.7;42.85;grain;europe
leon;León;castile;3;0;-5.6;42.6;cattle;europe
zamora;Zamora;castile;2;0;-5.9;41.65;grain;europe
salamanca;Salamanca;castile;3;0;-5.65;40.95;cattle;europe
valladolid;Valladolid;castile;4;1;-4.7;41.65;grain;europe
palencia;Palencia;castile;2;0;-4.5;42.2;grain;europe
burgos;Burgos;castile;3;1;-3.7;42.35;wool;europe
soria;Soria;castile;2;0;-2.45;41.75;wool;europe
logrono;La Rioja;castile;2;0;-2.45;42.4;wine;europe
segovia;Segovia;castile;3;0;-4.1;40.95;wool;europe
avila;Ávila;castile;2;0;-4.7;40.6;wool;europe
madrid;Madrid;castile;3;0;-3.7;40.4;grain;europe
toledo;Toledo;castile;4;1;-4.0;39.85;iron;europe
guadalajara;Guadalajara;castile;2;0;-2.9;40.75;grain;europe
cuenca;Cuenca;castile;2;0;-2.1;40.05;timber;europe
ciudadreal;La Mancha;castile;2;0;-3.4;39.0;wine;europe
albacete;Albacete;castile;2;0;-1.85;38.95;grain;europe
caceres;Cáceres;castile;2;0;-6.4;39.45;cattle;europe
badajoz;Badajoz;castile;2;0;-6.65;38.75;cattle;europe
plasencia;Plasencia;castile;2;0;-5.9;40.1;cattle;europe
seville;Seville;castile;5;1;-5.95;37.4;oil;europe
cordoba;Córdoba;castile;3;0;-4.8;37.9;horses;europe
jaen;Jaén;castile;2;0;-3.8;37.75;oil;europe
huelva;Niebla;castile;2;0;-6.9;37.4;fish;europe
jerez;Jerez;castile;3;0;-6.05;36.65;wine;europe
murcia;Murcia;castile;3;0;-1.15;38.0;silk;europe
cartagena;Cartagena;castile;2;0;-1.05;37.6;salt;europe
granada;Granada;granada;4;2;-3.6;37.2;silk;europe
malaga;Málaga;granada;3;1;-4.5;36.75;wine;europe
almeria;Almería;granada;2;1;-2.45;36.95;silk;europe
porto;Porto;portugal;3;1;-8.55;41.15;wine;europe
braga;Minho;portugal;2;0;-8.4;41.65;cattle;europe
braganca;Trás-os-Montes;portugal;2;0;-7.0;41.6;wine;europe
coimbra;Coimbra;portugal;3;0;-8.4;40.2;grain;europe
viseu;Beira;portugal;2;0;-7.4;40.6;timber;europe
lisbon;Lisbon;portugal;5;2;-9.1;38.75;salt;europe
evora;Alentejo;portugal;2;0;-7.9;38.55;grain;europe
faro;Algarve;portugal;2;0;-8.2;37.15;fish;europe
pamplona;Navarre;navarre;2;1;-1.65;42.8;grain;europe
zaragoza;Zaragoza;aragon;4;1;-0.9;41.65;grain;europe
huesca;Huesca;aragon;2;0;-0.4;42.15;wool;europe
teruel;Teruel;aragon;2;0;-1.1;40.35;wool;europe
barcelona;Barcelona;aragon;5;1;2.1;41.45;wool;europe
girona;Girona;aragon;2;0;2.8;42.0;cattle;europe
lleida;Lleida;aragon;2;0;0.7;41.75;grain;europe
tarragona;Tarragona;aragon;2;0;1.1;41.15;wine;europe
valencia;Valencia;aragon;4;0;-0.45;39.45;silk;europe
alicante;Alicante;aragon;2;0;-0.6;38.45;salt;europe
majorca;Majorca;aragon;2;0;2.95;39.6;oil;europe
cagliari;Cagliari;aragon;2;0;9.0;39.35;salt;europe
sassari;Sassari;aragon;1;0;8.7;40.6;silver;europe
palermo;Palermo;aragon;3;1;13.4;37.95;grain;europe
messina;Messina;aragon;2;0;15.2;38.05;silk;europe
syracuse;Syracuse;aragon;2;0;14.9;37.15;grain;europe
paris;Paris;france;6;2;2.35;48.85;grain;europe
rouen;Normandy;france;4;1;1.0;49.3;cattle;europe
caen;Lower Normandy;france;2;0;-0.6;49.1;cattle;europe
amiens;Picardy;france;3;0;2.3;49.9;grain;europe
reims;Champagne;france;3;0;4.0;49.2;wine;europe
orleans;Orléans;france;3;0;1.9;47.9;grain;europe
tours;Touraine;france;3;0;0.7;47.4;wine;europe
angers;Anjou;france;2;0;-0.55;47.45;wine;europe
poitiers;Poitou;france;2;0;0.35;46.6;grain;europe
bordeaux;Guyenne;france;4;1;-0.6;44.85;wine;europe
bayonne;Gascony;france;2;0;-1.0;43.75;timber;europe
toulouse;Toulouse;france;3;0;1.45;43.6;grain;europe
montpellier;Languedoc;france;3;0;3.9;43.65;wine;europe
clermont;Auvergne;france;2;0;3.1;45.75;cattle;europe
limoges;Limousin;france;2;0;1.25;45.85;cattle;europe
bourges;Berry;france;2;0;2.4;47.05;wool;europe
lyon;Lyon;france;4;1;4.85;45.75;silk;europe
grenoble;Dauphiné;france;2;0;5.75;45.2;timber;europe
marseille;Provence;france;3;1;5.4;43.45;oil;europe
rennes;Rennes;brittany;3;1;-1.7;48.1;cattle;europe
brest;Brest;brittany;2;0;-4.3;48.3;fish;europe
dijon;Burgundy;burgundy;4;1;5.0;47.3;wine;europe
besancon;Franche-Comté;burgundy;2;0;6.0;47.25;salt;europe
bruges;Flanders;burgundy;5;0;3.2;51.0;wool;europe
brussels;Brabant;burgundy;4;0;4.4;50.85;wool;europe
amsterdam;Holland;burgundy;3;0;4.8;52.35;fish;europe
arras;Artois;burgundy;2;0;2.8;50.3;grain;europe
luxembourg;Luxembourg;burgundy;2;1;6.1;49.6;iron;europe
calais;Calais;england;2;2;1.85;50.95;wool;europe
london;London;england;5;2;-0.1;51.5;wool;europe
winchester;Wessex;england;3;0;-1.9;51.0;wool;europe
exeter;Devon;england;2;0;-3.6;50.7;timber;europe
norwich;East Anglia;england;3;0;1.2;52.6;wool;europe
coventry;Midlands;england;3;0;-1.5;52.45;wool;europe
york;York;england;3;1;-1.1;53.95;wool;europe
durham;Northumbria;england;2;1;-1.6;54.9;iron;europe
lancaster;Lancashire;england;2;0;-2.7;53.8;cattle;europe
cardiff;Wales;england;2;0;-3.6;52.0;cattle;europe
dublin;The Pale;england;2;1;-6.3;53.35;cattle;europe
edinburgh;Edinburgh;scotland;3;1;-3.2;55.95;wool;europe
glasgow;Strathclyde;scotland;2;0;-4.6;55.75;fish;europe
inverness;Highlands;scotland;1;0;-4.5;57.3;timber;europe
cork;Munster;ireland;2;0;-8.5;52.0;cattle;europe
galway;Connacht;ireland;1;0;-9.0;53.4;cattle;europe
ulster;Ulster;ireland;1;0;-6.9;54.6;cattle;europe
copenhagen;Zealand;denmark;4;1;12.0;55.5;fish;europe
jutland;Jutland;denmark;3;0;9.2;56.2;cattle;europe
scania;Scania;denmark;3;0;13.4;55.85;grain;europe
oslo;Oslo;denmark;2;0;10.6;60.2;timber;europe
bergen;Bergen;denmark;2;0;6.3;60.6;fish;europe
trondheim;Trøndelag;denmark;1;0;10.6;63.3;fish;europe
iceland;Iceland;denmark;1;0;-19.0;64.8;fish;europe
stockholm;Stockholm;sweden;3;1;17.6;59.7;iron;europe
gothenburg;Götaland;sweden;2;0;14.0;57.8;timber;europe
norrland;Norrland;sweden;1;0;17.5;63.5;furs;europe
turku;Finland;sweden;2;0;23.3;61.0;furs;europe
lubeck;Lübeck;hansa;4;1;10.4;53.85;fish;europe
hamburg;Hamburg;hansa;4;1;9.7;53.4;grain;europe
cologne;Cologne;cologne;4;1;7.0;50.9;wine;europe
heidelberg;Palatinate;palatinate;3;0;8.6;49.5;wine;europe
kassel;Hesse;hesse;2;0;9.4;51.1;timber;europe
stuttgart;Württemberg;wurttemberg;3;0;9.2;48.75;wine;europe
luneburg;Brunswick;brunswick;3;0;10.2;52.6;salt;europe
berlin;Brandenburg;brandenburg;3;1;13.4;52.5;grain;europe
stettin;Pomerania;brandenburg;2;0;14.6;53.5;grain;europe
dresden;Saxony;saxony;3;1;13.6;51.0;silver;europe
erfurt;Thuringia;saxony;2;0;11.0;50.95;grain;europe
munich;Bavaria;bavaria;3;1;11.6;48.1;salt;europe
regensburg;Upper Palatinate;bavaria;2;0;12.1;49.0;iron;europe
vienna;Vienna;austria;5;2;16.4;48.2;wine;europe
graz;Styria;austria;3;1;15.4;47.1;iron;europe
innsbruck;Tyrol;austria;3;1;11.4;47.25;silver;europe
ljubljana;Carniola;austria;2;0;14.5;46.05;iron;europe
bern;Switzerland;swiss;3;1;7.5;46.95;cattle;europe
zurich;Zurich;swiss;3;0;8.55;47.35;cattle;europe
prague;Prague;bohemia;5;1;14.4;50.1;silver;europe
brno;Moravia;bohemia;3;0;16.6;49.2;grain;europe
breslau;Silesia;bohemia;3;0;17.0;51.1;grain;europe
turin;Piedmont;savoy;3;1;7.7;45.05;grain;europe
chambery;Savoy;savoy;2;1;5.9;45.55;cattle;europe
milan;Milan;milan;5;1;9.2;45.45;iron;europe
parma;Parma;milan;3;0;10.3;44.8;cattle;europe
genoa;Genoa;genoa;4;1;8.95;44.4;fish;europe
corsica;Corsica;genoa;1;0;9.1;42.15;timber;europe
venice;Venice;venice;5;2;12.3;45.45;salt;europe
verona;Verona;venice;3;0;11.0;45.45;wool;europe
zara;Dalmatia;venice;2;0;15.8;43.9;timber;europe
candia;Crete;venice;2;1;24.9;35.25;wine;europe
florence;Florence;florence;5;0;11.25;43.75;wool;europe
pisa;Pisa;florence;2;0;10.5;43.6;fish;europe
rome;Rome;papacy;5;1;12.5;41.9;wine;europe
bologna;Romagna;papacy;3;0;11.6;44.4;grain;europe
ancona;Marche;papacy;2;0;13.3;43.45;grain;europe
perugia;Umbria;papacy;2;0;12.4;43.05;oil;europe
naples;Naples;naples;5;1;14.25;40.85;silk;europe
abruzzo;Abruzzo;naples;2;0;13.9;42.2;wool;europe
bari;Apulia;naples;3;0;16.6;41.0;oil;europe
cosenza;Calabria;naples;2;0;16.25;39.2;silk;europe
krakow;Kraków;poland;4;1;19.9;50.05;salt;europe
warsaw;Masovia;poland;3;0;21.0;52.25;grain;europe
poznan;Greater Poland;poland;3;0;16.9;52.4;grain;europe
lviv;Red Ruthenia;poland;2;0;24.0;49.85;grain;europe
vilnius;Vilnius;lithuania;3;1;25.3;54.7;timber;europe
minsk;Minsk;lithuania;2;0;27.55;53.9;timber;russia
kiev;Kiev;lithuania;3;0;30.5;50.45;grain;russia
smolensk;Smolensk;lithuania;2;1;32.05;54.8;timber;russia
lutsk;Volhynia;lithuania;2;0;25.3;50.75;grain;europe
danzig;Danzig;teutonic;3;1;18.65;54.35;grain;europe
konigsberg;Prussia;teutonic;2;1;20.5;54.7;grain;europe
riga;Livonia;teutonic;2;1;24.1;56.95;furs;europe
buda;Buda;hungary;5;1;19.05;47.5;wine;europe
pressburg;Upper Hungary;hungary;3;0;18.5;48.6;silver;europe
kolozsvar;Transylvania;hungary;3;1;23.6;46.75;gold;europe
zagreb;Croatia;hungary;2;0;16.0;45.8;timber;europe
temesvar;Banat;hungary;2;1;21.2;45.75;grain;europe
moscow;Moscow;muscovy;4;1;37.6;55.75;furs;russia
ryazan;Ryazan;muscovy;2;0;39.7;54.6;grain;russia
nizhny;Nizhny Novgorod;muscovy;2;0;44.0;56.3;furs;russia
vologda;Vologda;muscovy;1;0;39.9;59.2;furs;russia
novgorod;Novgorod;novgorod;3;1;31.3;58.5;furs;russia
pskov;Pskov;novgorod;2;1;28.35;57.8;timber;russia
dvina;Dvina;novgorod;1;0;40.5;64.5;furs;russia
kazan;Kazan;kazan;2;1;49.1;55.8;furs;russia
astrakhan;Sarai;horde;2;0;46.0;47.0;horses;russia
crimea;Crimea;crimea;2;1;34.1;44.95;horses;russia
suceava;Moldavia;moldavia;2;1;26.25;47.65;cattle;europe
tirgoviste;Wallachia;wallachia;2;1;25.45;44.9;grain;europe
bosnia;Bosnia;bosnia;2;1;18.0;44.0;silver;europe
belgrade;Serbia;serbia;2;1;20.9;44.0;silver;europe
kruja;Albania;albania;1;1;19.8;41.5;wool;europe
constantinople;Constantinople;byzantium;6;3;28.95;41.05;silk;europe
mistra;Morea;byzantium;2;1;22.4;37.25;oil;europe
edirne;Thrace;ottomans;4;1;26.55;41.7;grain;europe
thessaloniki;Macedonia;ottomans;3;1;22.95;40.65;grain;europe
sofia;Bulgaria;ottomans;3;0;23.3;42.7;grain;europe
athens;Greece;ottomans;2;0;22.4;39.3;oil;europe
herat;Herat;timurids;4;1;62.2;34.35;silk;central_asia
mashhad;Khorasan;timurids;3;0;59.6;36.3;horses;central_asia
samarkand;Samarkand;timurids;5;1;66.95;39.65;silk;central_asia
bukhara;Bukhara;timurids;3;0;64.4;39.8;cotton;central_asia
kandahar;Kandahar;timurids;2;0;65.7;31.6;horses;central_asia
kazakh;Kazakh Steppe;uzbeks;1;0;68.0;47.0;horses;central_asia
madeira;Madeira;portugal;1;0;-16.95;32.7;sugar;atlantic
azores;Azores;portugal;1;0;-25.6;37.8;grain;atlantic
canaries;Canary Islands;natives;1;0;-15.5;28.1;sugar;atlantic
`;

const TABLE_WORLD = `
# amaf
pueblo;Pueblo Lands;natives;1;0;-106.0;35.5;cotton;north_america;pueblo
dakota;Dakota;natives;1;0;-100.5;46.5;cattle;north_america;sioux
blackfoot;Blackfoot;natives;1;0;-110.0;47.5;furs;north_america;algonquian
prairies;Saskatchewan;natives;1;0;-106.0;53.0;furs;north_america;cree
fraser;Fraser;natives;1;0;-123.5;52.5;fish;north_america;salish
mackenzie;Mackenzie;natives;1;0;-120.0;61.5;furs;north_america;dene
kivalliq;Kivalliq;natives;1;0;-95.0;63.0;fish;north_america;inuit
labrador;Labrador;natives;1;0;-62.0;54.0;fish;north_america;algonquian
havana;Havana;natives;1;0;-82.4;22.8;sugar;caribbean;taino
sonora;Sonora;natives;1;0;-110.0;29.5;silver;mexico;yaqui
nicaragua;Nicaragua;natives;2;0;-85.5;12.8;cotton;mexico;nahua
lima;Ychsma;natives;2;0;-76.8;-12.0;cotton;andes;quechua
copiapo;Copiapó;natives;1;0;-70.0;-27.5;silver;andes;diaguita
araucania;Araucanía;natives;1;0;-72.5;-38.5;timber;andes;mapuche
matogrosso;Mato Grosso;natives;1;0;-55.0;-13.0;timber;brazil;ge
goias;Goiás;natives;1;0;-48.5;-14.5;gold;brazil;ge
guapore;Guaporé;natives;1;0;-63.5;-10.0;timber;brazil;arawak
solimoes;Solimões;natives;1;0;-69.0;-4.0;spices;brazil;tupi
chaco;Gran Chaco;natives;1;0;-61.0;-23.0;timber;plata;guaycuru
pampas;Pampas;natives;1;0;-63.0;-37.0;cattle;plata;tehuelche
uruguay;Banda Oriental;natives;1;0;-56.0;-32.5;cattle;plata;charrua
santacruz;Santa Cruz;natives;1;0;-70.0;-49.5;wool;plata;tehuelche
futajallon;Futa Jallon;natives;1;0;-12.0;11.0;cattle;west_africa;fulani
liberia;Grain Coast;natives;1;0;-9.5;7.0;spices;west_africa;manding
air;Aïr;natives;2;0;8.5;17.5;salt;west_africa;berber
darfur;Darfur;natives;2;0;24.5;13.5;cattle;west_africa;fur
cameroon;Cameroon;natives;1;0;12.5;5.5;ivory;central_africa;bantu
loango;Loango;natives;2;0;12.0;-2.0;ivory;central_africa;bantu
ubangi;Ubangi;natives;1;0;19.5;4.0;ivory;central_africa;bantu
ituri;Ituri;natives;1;0;27.5;2.0;ivory;central_africa;bantu
kasai;Kasai;natives;1;0;21.5;-7.0;iron;central_africa;bantu
namibia;Namib;natives;1;0;17.5;-22.0;cattle;southern_africa;khoisan
highveld;Highveld;natives;1;0;27.5;-26.5;cattle;southern_africa;bantu
natal;Natal;natives;1;0;30.5;-29.0;cattle;southern_africa;bantu
barotse;Barotse;natives;1;0;23.5;-15.5;cattle;southern_africa;bantu
sennar;Alodia;natives;2;0;33.5;13.5;cotton;east_africa;nubian
kitara;Kitara;natives;2;0;31.5;1.0;cattle;east_africa;bantu
majeerteen;Majeerteen;natives;1;0;48.5;9.0;spices;east_africa;somali
unyamwezi;Unyamwezi;natives;1;0;33.0;-5.5;ivory;east_africa;bantu
# mena
bursa;Bursa;ottomans;6;2;29.05;40.15;silk;middle_east;turkish
kocaeli;Kocaeli;ottomans;3;1;30.35;40.6;timber;middle_east;turkish
karesi;Karesi;ottomans;2;0;27.75;39.75;grain;middle_east;turkish
izmir;İzmir;ottomans;3;1;27.35;38.5;oil;middle_east;greek
aydin;Aydın;ottomans;3;0;28.3;37.75;cotton;middle_east;turkish
kutahya;Germiyan;ottomans;3;0;29.95;39.35;wool;middle_east;turkish
hamid;Hamid;ottomans;2;0;30.4;38.1;wool;middle_east;turkish
antalya;Antalya;ottomans;3;1;30.65;37.0;timber;middle_east;turkish
eskisehir;Sultanönü;ottomans;2;0;31.15;39.6;horses;middle_east;turkish
bolu;Bolu;ottomans;2;0;31.85;40.8;timber;middle_east;turkish
ankara;Ankara;ottomans;4;1;32.85;39.95;wool;middle_east;turkish
amasya;Amasya;ottomans;3;1;35.85;40.65;grain;middle_east;turkish
sivas;Sivas;ottomans;3;1;37.0;39.75;horses;middle_east;turkish
kastamonu;Kastamonu;candar;3;1;33.75;41.3;iron;middle_east;turkish
sinop;Sinop;candar;3;1;34.95;41.7;timber;middle_east;turkish
konya;Konya;karaman;5;2;32.5;37.85;wool;middle_east;turkish
larende;Larende;karaman;3;1;33.25;37.2;grain;middle_east;turkish
kirsehir;Kırşehir;karaman;2;0;34.15;39.15;grain;middle_east;turkish
kayseri;Kayseri;karaman;3;1;35.5;38.7;cattle;middle_east;turkish
adana;Adana;ramadanids;3;1;35.3;37.0;cotton;middle_east;turkish
maras;Maraş;dulkadir;2;1;36.9;37.6;cattle;middle_east;turkish
elbistan;Elbistan;dulkadir;3;1;37.2;38.25;horses;middle_east;turkish
malatya;Malatya;mamluks;2;2;38.3;38.35;grain;middle_east;turkish
erzincan;Erzincan;aqqoyunlu;2;1;39.5;39.7;wool;middle_east;armenian
erzurum;Erzurum;qaraqoyunlu;3;2;41.25;39.9;cattle;middle_east;armenian
kars;Kars;qaraqoyunlu;2;1;43.05;40.6;cattle;middle_east;armenian
van;Van;qaraqoyunlu;3;2;43.6;38.4;fish;middle_east;armenian
bitlis;Bitlis;kurds;2;2;42.1;38.4;wool;middle_east;kurdish
trebizond;Trebizond;trebizond;4;2;39.75;40.85;silk;middle_east;greek
giresun;Kerasous;trebizond;2;1;38.4;40.8;timber;middle_east;greek
rhodes;Rhodes;hospitallers;2;3;28.0;36.2;wine;middle_east;greek
tbilisi;Kartli;georgia;3;2;44.8;41.7;wine;middle_east;georgian
kutaisi;Imereti;georgia;2;1;42.7;42.25;wine;middle_east;georgian
kakheti;Kakheti;georgia;2;1;45.9;41.85;silk;middle_east;georgian
yerevan;Yerevan;qaraqoyunlu;2;1;44.5;40.15;grain;middle_east;armenian
karabakh;Karabakh;qaraqoyunlu;2;1;46.7;40.1;horses;middle_east;azeri
shamakhi;Shirvan;shirvan;4;1;48.6;40.65;silk;middle_east;azeri
derbent;Derbent;shirvan;2;2;48.1;41.95;fish;middle_east;azeri
dagestan;Dagestan;dagestan;1;1;47.0;42.75;wool;middle_east;dagestani
kabarda;Kabarda;circassia;1;0;43.5;43.6;horses;middle_east;circassian
circassia;Circassia;circassia;1;0;39.3;44.6;timber;middle_east;circassian
diyarbakir;Diyarbakır;aqqoyunlu;5;2;40.2;37.9;wool;middle_east;kurdish
mardin;Mardin;aqqoyunlu;3;2;40.75;37.3;cotton;middle_east;arab
urfa;Urfa;aqqoyunlu;3;1;38.8;37.15;grain;middle_east;arab
mosul;Mosul;aqqoyunlu;3;1;43.1;36.35;cotton;middle_east;arab
hakkari;Hakkari;kurds;1;1;43.75;37.55;wool;middle_east;kurdish
erbil;Erbil;qaraqoyunlu;2;0;44.05;36.2;grain;middle_east;kurdish
shahrizor;Shahrizor;kurds;2;1;45.4;35.55;cattle;middle_east;kurdish
tikrit;Tikrit;qaraqoyunlu;1;0;43.75;34.6;grain;middle_east;arab
baghdad;Baghdad;qaraqoyunlu;5;2;44.4;33.3;grain;middle_east;arab
hilla;Hilla;qaraqoyunlu;3;0;44.45;32.45;grain;middle_east;arab
wasit;Wasit;qaraqoyunlu;2;0;45.85;32.45;grain;middle_east;arab
basra;Basra;qaraqoyunlu;3;1;47.8;30.55;horses;middle_east;arab
cyprus;Cyprus;cyprus;3;2;32.95;35.0;sugar;middle_east;greek
famagusta;Famagusta;genoa;2;2;33.85;35.2;cotton;middle_east;greek
aleppo;Aleppo;mamluks;6;2;37.15;36.2;cotton;middle_east;arab
antioch;Antioch;mamluks;2;1;36.2;36.2;silk;middle_east;arab
hama;Hama;mamluks;3;1;36.75;35.15;grain;middle_east;arab
trablus;Trablus;mamluks;3;1;35.95;34.4;oil;middle_east;arab
damascus;Damascus;mamluks;6;2;36.3;33.5;silk;middle_east;arab
safed;Safed;mamluks;2;1;35.45;32.95;cotton;middle_east;arab
jerusalem;Jerusalem;mamluks;3;1;35.2;31.75;oil;middle_east;arab
gaza;Gaza;mamluks;2;0;34.55;31.4;grain;middle_east;arab
karak;Kerak;mamluks;2;2;35.75;31.1;wool;middle_east;arab
palmyra;Palmyra;bedouins;1;0;38.3;34.6;salt;middle_east;arab
raqqa;Raqqa;mamluks;1;0;39.0;35.95;cotton;middle_east;arab
cairo;Cairo;mamluks;8;3;31.25;30.05;grain;north_africa;arab
alexandria;Alexandria;mamluks;5;2;30.1;31.05;cotton;north_africa;arab
damietta;Damietta;mamluks;3;1;31.6;31.2;fish;north_africa;arab
gharbiya;Gharbiya;mamluks;4;0;31.0;30.8;grain;north_africa;arab
fayyum;Fayyum;mamluks;3;0;30.75;29.3;sugar;north_africa;arab
minya;Minya;mamluks;3;0;30.75;28.1;grain;north_africa;arab
asyut;Asyut;mamluks;3;0;31.2;27.2;grain;north_africa;arab
qus;Qus;mamluks;3;0;32.75;25.95;sugar;north_africa;arab
aswan;Aswan;mamluks;2;1;32.9;24.1;grain;north_africa;nubian
kharga;Western Oases;mamluks;1;0;30.55;25.45;salt;north_africa;arab
siwa;Siwa;tribes;1;0;25.5;29.2;salt;north_africa;berber
marmarica;Marmarica;mamluks;1;0;24.0;31.6;wool;north_africa;arab
barqa;Cyrenaica;mamluks;2;0;21.5;32.5;horses;north_africa;arab
awjila;Awjila;tribes;1;0;21.3;29.1;salt;north_africa;berber
nubia;Nubia;tribes;1;0;30.6;18.6;gold;north_africa;nubian
aidhab;Red Sea Hills;tribes;1;0;35.0;21.5;gold;north_africa;beja
tabriz;Tabriz;qaraqoyunlu;6;2;46.3;38.05;silk;middle_east;azeri
ardabil;Ardabil;qaraqoyunlu;3;1;48.3;38.25;cattle;middle_east;azeri
zanjan;Sultaniyeh;qaraqoyunlu;2;0;48.6;36.6;grain;middle_east;azeri
gilan;Gilan;gilan;3;1;49.6;37.2;silk;middle_east;persian
mazandaran;Mazandaran;timurids;3;1;52.6;36.45;timber;middle_east;persian
qazvin;Qazvin;qaraqoyunlu;3;0;50.0;36.2;wine;middle_east;persian
rayy;Rayy;qaraqoyunlu;3;0;51.45;35.55;grain;middle_east;persian
hamadan;Hamadan;qaraqoyunlu;3;0;48.5;34.8;wool;middle_east;persian
kermanshah;Kermanshah;qaraqoyunlu;2;0;47.1;34.3;horses;middle_east;kurdish
luristan;Luristan;qaraqoyunlu;1;1;48.3;33.4;wool;middle_east;persian
khuzestan;Khuzestan;qaraqoyunlu;2;0;48.7;31.6;sugar;middle_east;arab
isfahan;Isfahan;qaraqoyunlu;5;1;51.65;32.65;cotton;middle_east;persian
kashan;Kashan;qaraqoyunlu;3;0;51.45;33.95;silk;middle_east;persian
yazd;Yazd;qaraqoyunlu;3;0;54.35;31.9;silk;middle_east;persian
shiraz;Fars;qaraqoyunlu;4;1;52.55;29.6;wine;middle_east;persian
lar;Laristan;qaraqoyunlu;2;0;54.3;27.7;horses;middle_east;persian
kerman;Kerman;qaraqoyunlu;3;1;57.05;30.3;wool;middle_east;persian
hormuz;Hormuz;hormuz;5;2;56.4;27.3;spices;middle_east;persian
mecca;Mecca;mamluks;4;0;39.85;21.45;spices;middle_east;arab
medina;Medina;mamluks;2;0;39.6;24.45;cattle;middle_east;arab
tabuk;Tabuk;bedouins;1;0;36.6;28.4;horses;middle_east;arab
asir;Asir;bedouins;1;0;42.5;18.3;cattle;middle_east;arab
yemen;Sana'a;yemen;4;2;44.2;15.35;spices;middle_east;arab
zabid;Zabid;yemen;3;1;43.3;14.2;cotton;middle_east;arab
aden;Aden;yemen;3;2;45.0;12.95;spices;middle_east;arab
hadramawt;Hadramawt;hadramawt;2;1;48.9;15.95;spices;middle_east;arab
dhofar;Dhofar;hadramawt;1;0;54.0;17.3;spices;middle_east;arab
muscat;Muscat;oman;2;1;58.4;23.55;fish;middle_east;arab
nizwa;Nizwa;oman;2;1;57.5;22.95;cattle;middle_east;arab
sohar;Sohar;hormuz;2;1;56.55;24.25;fish;middle_east;arab
bahrain;Bahrain;hormuz;2;1;50.55;26.05;fish;middle_east;arab
hasa;al-Hasa;bedouins;2;0;49.55;25.4;horses;middle_east;arab
najd;Najd;bedouins;1;0;46.7;24.6;horses;middle_east;arab
hail;Jabal Shammar;bedouins;1;0;41.7;27.5;horses;middle_east;arab
badiya;Syrian Desert;bedouins;1;0;39.5;32.3;horses;middle_east;arab
rubalkhali;Empty Quarter;bedouins;1;0;50.5;20.5;horses;middle_east;arab
fez;Fez;morocco;5;2;-5.0;34.05;wool;north_africa;maghrebi
tangier;Tangier;morocco;3;1;-5.8;35.5;fish;north_africa;maghrebi
ceuta;Ceuta;portugal;2;3;-5.35;35.85;fish;north_africa;portuguese
rif;Rif;morocco;2;0;-4.0;35.0;timber;north_africa;berber
taza;Taza;morocco;2;1;-4.0;34.15;grain;north_africa;berber
sale;Salé;morocco;3;1;-6.6;33.9;fish;north_africa;maghrebi
doukkala;Doukkala;morocco;2;0;-8.5;32.6;grain;north_africa;maghrebi
marrakesh;Marrakesh;morocco;4;1;-8.0;31.6;sugar;north_africa;maghrebi
agadir;Sous;morocco;2;0;-8.9;30.45;sugar;north_africa;berber
draa;Draa;tribes;1;0;-6.0;30.3;salt;north_africa;berber
tafilalt;Tafilalt;tribes;2;0;-4.3;31.3;gold;north_africa;berber
saguia;Saguia el-Hamra;tribes;1;0;-11.5;26.8;cattle;north_africa;berber
tlemcen;Tlemcen;tlemcen;4;2;-1.3;34.9;wool;north_africa;maghrebi
oran;Oran;tlemcen;3;1;-0.65;35.6;grain;north_africa;maghrebi
chelif;Chelif;tlemcen;2;0;1.3;36.0;cattle;north_africa;maghrebi
algiers;Algiers;tlemcen;3;1;3.05;36.65;fish;north_africa;maghrebi
bejaia;Béjaïa;tunis;3;1;5.0;36.6;timber;north_africa;maghrebi
constantine;Constantine;tunis;3;2;6.6;36.35;grain;north_africa;maghrebi
annaba;Bône;tunis;2;1;7.75;36.8;grain;north_africa;maghrebi
biskra;Zab;tunis;2;0;5.75;34.85;cattle;north_africa;berber
tunis;Tunis;tunis;5;2;10.1;36.75;oil;north_africa;maghrebi
kairouan;Kairouan;tunis;3;0;10.1;35.65;grain;north_africa;maghrebi
sfax;Sfax;tunis;2;0;10.5;34.75;oil;north_africa;maghrebi
jerid;Jerid;tunis;2;0;8.4;34.0;salt;north_africa;berber
tripoli;Tripoli;tunis;3;1;13.15;32.8;salt;north_africa;maghrebi
sirte;Sirte;tribes;1;0;16.5;30.6;wool;north_africa;arab
laghouat;Laghouat;tribes;1;0;2.9;33.8;wool;north_africa;berber
ouargla;Ouargla;tribes;1;0;5.3;31.95;salt;north_africa;berber
tuat;Tuat;tribes;1;0;0.3;27.9;gold;north_africa;berber
hoggar;Hoggar;tribes;1;0;5.5;23.0;salt;north_africa;berber
fezzan;Fezzan;tribes;1;0;14.4;26.0;salt;north_africa;berber
# eastasia
beijing;Beijing;ming;7;3;116.4;39.9;grain;china;han
baoding;Baoding;ming;4;1;115.5;38.85;grain;china;han
tianjin;Tianjin;ming;4;1;117.2;39.1;salt;china;han
xuanfu;Xuanfu;ming;3;3;115.05;40.6;horses;china;han
zhending;Zhending;ming;4;0;114.55;38.0;cotton;china;han
daming;Daming;ming;4;0;115.0;36.3;cotton;china;han
jinan;Jinan;ming;4;1;117.0;36.65;grain;china;han
yanzhou;Yanzhou;ming;4;0;116.6;35.5;grain;china;han
dengzhou;Dengzhou;ming;3;1;120.0;36.9;fish;china;han
taiyuan;Taiyuan;ming;4;1;112.55;37.85;iron;china;han
datong;Datong;ming;3;3;113.3;40.1;horses;china;han
pingyang;Pingyang;ming;4;0;111.5;36.1;salt;china;han
kaifeng;Kaifeng;ming;4;1;114.35;34.8;grain;china;han
luoyang;Luoyang;ming;4;1;112.45;34.65;grain;china;han
nanyang;Nanyang;ming;3;0;112.5;33.0;grain;china;han
xian;Xi'an;ming;4;2;108.9;34.3;grain;china;han
hanzhong;Hanzhong;ming;3;1;107.0;33.1;grain;china;han
yansui;Yansui;ming;2;3;109.7;37.8;horses;china;han
lanzhou;Lanzhou;ming;3;1;103.8;36.05;horses;china;han
ningxia;Ningxia;ming;2;2;106.25;38.45;horses;china;han
zhangye;Hexi;ming;2;2;100.45;38.95;horses;china;han
chengdu;Chengdu;ming;4;1;104.05;30.65;silk;china;han
chongqing;Chongqing;ming;4;1;106.55;29.55;grain;china;han
luzhou;Luzhou;ming;3;0;105.45;28.9;salt;china;han
wuhan;Wuchang;ming;4;1;114.3;30.55;grain;china;han
jingzhou;Jingzhou;ming;4;1;112.2;30.35;grain;china;han
xiangyang;Xiangyang;ming;4;1;112.15;32.0;grain;china;han
changsha;Changsha;ming;4;0;112.95;28.2;grain;china;han
hengzhou;Hengzhou;ming;3;0;112.6;26.9;grain;china;han
yuanzhou;Yuanzhou;ming;2;1;109.95;27.55;timber;china;miao
nanchang;Nanchang;ming;4;1;115.9;28.7;grain;china;han
jingdezhen;Jingdezhen;ming;4;0;117.2;29.3;porcelain;china;han
ganzhou;Ganzhou;ming;3;1;114.95;25.85;timber;china;han
nanjing;Nanjing;ming;7;3;118.8;32.05;silk;china;han
suzhou;Suzhou;ming;7;1;120.6;31.3;silk;china;han
songjiang;Songjiang;ming;5;0;121.25;31.0;cotton;china;han
changzhou;Changzhou;ming;5;0;119.95;31.75;grain;china;han
yangzhou;Yangzhou;ming;5;1;119.45;32.55;salt;china;han
huaian;Huai'an;ming;4;1;119.1;33.55;salt;china;han
xuzhou;Xuzhou;ming;4;1;117.2;34.25;grain;china;han
fengyang;Fengyang;ming;4;1;117.55;32.85;grain;china;han
huizhou;Huizhou;ming;4;0;118.3;29.85;timber;china;han
hangzhou;Hangzhou;ming;7;1;120.15;30.25;silk;china;han
jiaxing;Jiaxing;ming;5;0;120.45;30.75;silk;china;han
ningbo;Ningbo;ming;4;1;121.4;29.85;fish;china;han
wenzhou;Wenzhou;ming;4;1;120.65;28.2;fish;china;han
fuzhou;Fuzhou;ming;4;1;119.3;26.1;fish;china;han
quanzhou;Quanzhou;ming;4;1;118.6;24.95;porcelain;china;han
zhangzhou;Zhangzhou;ming;4;0;117.65;24.5;sugar;china;han
jianning;Jianning;ming;3;0;118.3;27.3;timber;china;han
guangzhou;Guangzhou;ming;5;2;113.25;23.15;silk;china;han
chaozhou;Chaozhou;ming;4;0;116.6;23.65;sugar;china;han
gaozhou;Gaozhou;ming;3;0;110.6;21.65;sugar;china;han
hainan;Qiongzhou;ming;2;1;109.8;19.3;salt;china;han
guilin;Guilin;ming;3;1;110.3;25.3;grain;china;han
nanning;Nanning;ming;2;1;108.35;22.8;grain;china;zhuang
guiyang;Guiyang;ming;2;1;106.7;26.6;timber;china;miao
kunming;Kunming;ming;3;1;102.7;25.05;silver;china;han
dali;Dali;ming;3;1;100.2;25.6;horses;china;bai
linan;Lin'an;ming;2;0;102.8;23.65;iron;china;yi
liaoyang;Liaoyang;ming;3;2;123.2;41.3;grain;china;han
guangning;Guangning;ming;2;2;121.8;41.55;horses;china;han
hanseong;Hanseong;korea;6;2;127.0;37.55;grain;china;korean
pyongyang;Pyongyang;korea;4;2;125.75;39.0;iron;china;korean
uiju;Pyongan;korea;2;2;124.9;40.0;timber;china;korean
hamhung;Hamhung;korea;3;1;127.5;39.9;cattle;china;korean
gilju;Hamgyong;korea;2;2;129.3;41.2;furs;china;korean
gangneung;Gangwon;korea;2;0;128.6;37.65;fish;china;korean
chungju;Chungcheong;korea;4;0;127.5;36.6;grain;china;korean
jeonju;Jeolla;korea;4;1;127.0;35.5;grain;china;korean
gyeongju;Gyeongju;korea;4;1;129.1;35.9;silk;china;korean
jinju;Jinju;korea;3;1;128.1;35.2;cotton;china;korean
jeju;Jeju;korea;1;0;126.55;33.38;horses;china;korean
kyoto;Kyoto;japan;6;1;135.75;35.05;silk;china;japanese
omi;Ōmi;japan;4;1;136.25;35.35;grain;china;japanese
settsu;Settsu;hosokawa;5;1;135.3;34.7;grain;china;japanese
kawachi;Kawachi;hatakeyama;4;1;135.75;34.15;timber;china;japanese
harima;Harima;yamana;4;1;134.7;34.9;salt;china;japanese
tajima;Tajima;yamana;3;2;134.6;35.4;cattle;china;japanese
iwami;Iwami;yamana;2;0;132.5;35.0;silver;china;japanese
suo;Suō;ouchi;4;2;131.6;34.15;grain;china;japanese
sanuki;Sanuki;hosokawa;3;0;134.0;34.15;salt;china;japanese
tosa;Tosa;hosokawa;2;0;133.4;33.6;timber;china;japanese
hakata;Hakata;ouchi;4;1;130.5;33.5;fish;china;japanese
bungo;Bungo;otomo;3;2;131.4;33.15;grain;china;japanese
higo;Higo;otomo;3;0;130.8;32.65;grain;china;japanese
hyuga;Hyūga;shimazu;2;0;131.3;32.1;timber;china;japanese
satsuma;Satsuma;shimazu;3;2;130.45;31.65;horses;china;japanese
owari;Owari;shiba;4;1;136.9;35.15;grain;china;japanese
echizen;Echizen;shiba;3;1;136.2;35.95;grain;china;japanese
etchu;Etchū;hatakeyama;2;0;137.2;36.6;grain;china;japanese
kai;Kai;takeda;2;2;138.6;35.65;gold;china;japanese
suruga;Suruga;imagawa;3;1;138.3;35.05;grain;china;japanese
edo;Musashi;uesugi;3;1;139.5;35.8;grain;china;japanese
echigo;Echigo;uesugi;3;1;138.85;37.4;grain;china;japanese
mutsu;Mutsu;date;2;1;140.45;37.75;horses;china;japanese
nanbu;Nanbu;date;1;0;141.15;39.6;horses;china;japanese
oshima;Oshima;natives;1;0;140.45;41.9;fish;china;ainu
ezo;Ezo;natives;1;0;142.8;43.4;furs;china;ainu
ryukyu;Ryukyu;ryukyu;3;1;127.78;26.33;fish;china;ryukyuan
taiwan;Taiwan;natives;1;0;120.9;23.8;furs;china;formosan
karakorum;Khalkha;mongols;1;0;102.8;47.2;horses;china;mongol
kherlen;Kherlen;mongols;1;0;111.0;47.3;horses;china;mongol
chahar;Chahar;mongols;2;0;115.5;42.6;horses;china;mongol
tumed;Tumed;mongols;1;0;111.7;41.0;horses;china;mongol
ordos;Ordos;mongols;1;0;108.3;39.6;horses;china;mongol
uriankhai;Uriankhai;mongols;1;0;120.0;43.5;cattle;china;mongol
khovd;Khovd;oirats;2;1;92.0;48.0;horses;china;oirat
dzungaria;Dzungaria;oirats;2;0;86.5;45.5;horses;china;oirat
liaodong;Jianzhou;jurchens;2;1;125.3;41.9;furs;china;jurchen
haixi;Haixi;jurchens;1;0;126.5;44.0;furs;china;jurchen
amur;Yeren;natives;1;0;130.5;46.5;furs;china;jurchen
lhasa;Ü;tibet;3;1;91.1;29.65;wool;china;tibetan
tsang;Tsang;tibet;2;1;88.9;29.3;wool;china;tibetan
ngari;Ngari;tibet;1;0;81.5;31.3;gold;china;tibetan
kham;Kham;natives;1;0;97.2;31.15;cattle;china;tibetan
amdo;Amdo;natives;1;0;100.5;34.5;horses;china;tibetan
hanoi;Thang Long;daiviet;6;2;105.85;21.0;grain;east_indies;viet
sonnam;Sơn Nam;daiviet;4;0;106.15;20.4;grain;east_indies;viet
thanhhoa;Thanh Hóa;daiviet;3;1;105.6;19.85;grain;east_indies;viet
nghean;Nghệ An;daiviet;3;1;105.4;18.8;timber;east_indies;viet
thuanhoa;Thuận Hóa;daiviet;2;1;107.4;16.45;fish;east_indies;viet
amaravati;Amaravati;champa;2;0;108.1;15.6;spices;east_indies;cham
champa;Vijaya;champa;3;1;108.9;14.0;spices;east_indies;cham
panduranga;Panduranga;champa;2;0;108.7;11.9;cotton;east_indies;cham
angkor;Chaktomuk;khmer;4;1;104.85;11.8;grain;east_indies;khmer
siemreap;Angkor;khmer;2;0;103.85;13.4;grain;east_indies;khmer
preynokor;Prey Nokor;khmer;2;0;105.9;10.3;fish;east_indies;khmer
ayutthaya;Ayutthaya;ayutthaya;6;2;100.55;14.35;grain;east_indies;thai
sukhothai;Sukhothai;ayutthaya;3;1;100.1;16.9;grain;east_indies;thai
korat;Korat;ayutthaya;2;1;102.1;15.0;cattle;east_indies;thai
ligor;Ligor;ayutthaya;3;1;99.9;8.4;spices;east_indies;thai
chiangmai;Chiang Mai;lanna;4;1;98.98;18.8;timber;east_indies;thai
chiangrai;Chiang Rai;lanna;2;0;99.85;19.9;grain;east_indies;thai
luangprabang;Luang Prabang;lanxang;3;1;102.15;19.9;ivory;east_indies;lao
vientiane;Vientiane;lanxang;3;0;102.6;18.0;grain;east_indies;lao
ava;Ava;ava;4;2;96.0;21.9;grain;east_indies;burmese
toungoo;Toungoo;ava;2;1;96.45;18.95;timber;east_indies;burmese
pegu;Pegu;hanthawaddy;4;1;96.5;17.3;grain;east_indies;mon
martaban;Martaban;hanthawaddy;2;1;97.6;16.5;timber;east_indies;mon
mraukoo;Mrauk U;arakan;3;1;93.2;20.6;grain;east_indies;rakhine
hsenwi;Hsenwi;natives;1;0;97.6;23.0;silver;east_indies;shan
kengtung;Kengtung;natives;1;0;99.6;21.3;timber;east_indies;shan
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
borneo;Borneo;natives;1;0;113.5;0.5;timber;east_indies;dayak
makassar;Gowa;natives;1;0;119.7;-5.0;grain;east_indies;bugis
ternate;Ternate;ternate;3;1;127.75;1.0;spices;east_indies;moluccan
tidore;Tidore;tidore;2;0;128.1;0.4;spices;east_indies;moluccan
seram;Seram;natives;1;0;129.5;-3.15;spices;east_indies;moluccan
luzon;Luzon;natives;1;0;121.0;15.5;gold;east_indies;filipino
visayas;Visayas;natives;1;0;123.0;10.2;fish;east_indies;filipino
mindanao;Mindanao;natives;1;0;125.0;7.6;spices;east_indies;filipino
sulu;Sulu;sulu;2;0;121.05;6.0;fish;east_indies;filipino
newguinea;New Guinea;natives;1;0;138.5;-4.0;timber;east_indies;papuan
# rest
agra;Agra;delhi;3;1;78.0;27.2;grain;india;hindustani
sirhind;Sirhind;delhi;2;0;76.4;30.6;grain;india;hindustani
daulatabad;Daulatabad;bahmani;3;2;75.3;19.9;cotton;india;marathi
berar;Berar;bahmani;2;0;77.6;20.9;cotton;india;marathi
warangal;Telangana;bahmani;3;1;79.6;18.0;cotton;india;telugu
chandragiri;Chandragiri;vijayanagara;2;1;79.0;14.2;cotton;india;telugu
mysore;Mysore;vijayanagara;2;0;76.6;12.6;spices;india;kannada
madurai;Madurai;vijayanagara;3;0;78.1;9.9;cotton;india;tamil
cochin;Cochin;calicut;2;0;76.4;10.0;spices;india;malayali
sonargaon;East Bengal;bengal;3;0;90.4;23.7;cotton;india;bengali
gondwana;Gondwana;natives;1;0;80.5;22.5;timber;india;gondi
djenne;Djenné;mali;3;0;-4.55;13.9;grain;west_africa;manding
kukiya;Kukiya;songhai;2;0;1.0;14.3;grain;west_africa;songhai
ouagadougou;Mossi;mossi;2;1;-1.5;12.4;horses;west_africa;mossi
bono;Bono;natives;1;0;-1.9;7.9;gold;west_africa;akan
oyo;Oyo;oyo;2;1;3.9;8.6;horses;west_africa;yoruba
katsina;Katsina;hausa;2;0;7.6;13.0;cotton;west_africa;hausa
kanem;Kanem;bornu;1;0;15.5;14.0;cattle;west_africa;kanuri
soyo;Soyo;kongo;1;0;12.6;-6.4;ivory;central_africa;bantu
luba;Luba;natives;1;0;26.5;-8.5;iron;central_africa;bantu
butua;Butua;natives;1;0;29.5;-20.3;gold;southern_africa;bantu
boina;Boina;natives;1;0;46.5;-15.8;cattle;southern_africa;malagasy
malindi;Malindi;kilwa;2;0;39.9;-3.0;spices;east_africa;swahili
shewa;Shewa;ethiopia;2;0;39.0;9.2;grain;east_africa;amhara
gojjam;Gojjam;ethiopia;2;0;37.5;10.5;grain;east_africa;amhara
zeila;Zeila;adal;2;0;43.0;10.6;cattle;east_africa;somali
mogadishu;Mogadishu;ajuran;3;0;44.6;3.5;cattle;east_africa;somali
acadia;Acadia;natives;1;0;-66.5;46.0;fish;north_america;algonquian
hudsonvalley;Hudson Valley;natives;1;0;-74.0;41.8;furs;north_america;algonquian
guale;Georgia;natives;1;0;-83.0;32.5;cotton;north_america;muskogean
appalachia;Appalachia;natives;1;0;-84.0;37.0;furs;north_america;cherokee
puertorico;Puerto Rico;natives;1;0;-66.5;18.25;sugar;caribbean;taino
antilles;Lesser Antilles;natives;1;0;-61.65;16.15;sugar;caribbean;carib
bahamas;Bahamas;natives;1;0;-78.0;24.4;salt;caribbean;taino
cuernavaca;Cuauhnahuac;aztec;3;0;-99.2;18.6;cotton;mexico;nahua
huasteca;Huasteca;aztec;2;0;-98.5;21.8;cotton;mexico;nahua
tlaxcala;Tlaxcala;tlaxcala;3;2;-98.2;19.3;grain;mexico;nahua
mixteca;Mixteca;mixtec;3;1;-97.7;17.3;gold;mexico;mixtec
collao;Collao;inca;3;0;-69.8;-15.8;wool;andes;aymara
lambayeque;Lambayeque;chimor;2;0;-79.8;-6.7;cotton;andes;chimu
muisca;Bacatá;muisca;3;0;-74.1;5.0;gold;andes;muisca
tunja;Tunja;muisca;2;0;-73.35;5.55;gold;andes;muisca
para;Pará;natives;1;0;-48.5;-2.5;timber;brazil;tupi
ceara;Ceará;natives;1;0;-39.5;-5.0;cattle;brazil;tupi
espiritosanto;Espírito Santo;natives;1;0;-41.0;-19.5;sugar;brazil;tupi
santacatarina;Santa Catarina;natives;1;0;-50.5;-27.0;cattle;brazil;guarani
tucuman;Tucumán;natives;1;0;-65.2;-26.8;cattle;plata;diaguita
tver;Tver;tver;3;1;35.9;56.85;grain;russia;russian
rostov;Rostov;muscovy;2;0;39.2;57.0;grain;russia;russian
yaroslavl;Yaroslavl;muscovy;2;0;39.9;58.0;timber;russia;russian
vyatka;Vyatka;muscovy;1;0;49.7;58.6;furs;russia;russian
perm;Perm;novgorod;1;0;56.3;60.4;furs;russia;komi
karelia;Karelia;novgorod;1;0;33.5;62.5;furs;russia;karelian
halogaland;Hålogaland;denmark;1;0;15.5;67.5;fish;europe;norwegian
dalarna;Dalarna;sweden;2;0;15.0;60.5;iron;europe;swedish
yenisei;Yenisei;natives;1;0;92.0;58.0;furs;siberia;siberian
baikal;Baikal;natives;1;0;106.0;53.0;furs;siberia;mongol
balkh;Balkh;timurids;3;1;66.9;36.7;horses;central_asia;persian
khwarazm;Khwarazm;timurids;2;0;60.6;41.5;cotton;central_asia;uzbek
kashgar;Kashgar;moghulistan;2;0;76.0;39.5;horses;central_asia;uyghur
ili;Moghulistan;moghulistan;1;0;78.5;43.6;horses;central_asia;chagatai
capeverde;Cape Verde;natives;1;0;-23.6;15.1;salt;west_africa
jolof;Jolof;jolof;2;0;-15.5;15.5;cattle;west_africa
timbuktu;Timbuktu;mali;3;0;-3.0;16.8;gold;west_africa
niani;Mali;mali;3;1;-9.0;11.5;gold;west_africa
gao;Songhai;songhai;3;1;0.0;16.3;gold;west_africa
elmina;Gold Coast;natives;1;0;-1.4;6.0;gold;west_africa
benin;Benin;benin;2;1;5.6;6.4;ivory;west_africa
kano;Hausa;hausa;3;1;8.5;12.0;cotton;west_africa
bornu;Bornu;bornu;2;1;13.2;12.0;ivory;west_africa
kongo;Kongo;kongo;3;1;14.3;-5.0;ivory;central_africa
ndongo;Ndongo;natives;1;0;15.5;-9.5;ivory;central_africa
lunda;Congo Basin;natives;1;0;22.5;-3.0;ivory;central_africa
cape;The Cape;natives;1;0;19.5;-33.0;cattle;southern_africa
mutapa;Mutapa;mutapa;2;0;31.0;-17.5;gold;southern_africa
sofala;Sofala;natives;1;0;34.8;-19.8;gold;southern_africa
madagascar;Madagascar;natives;1;0;46.8;-19.0;cattle;southern_africa
kilwa;Kilwa;kilwa;3;0;39.3;-8.95;ivory;east_africa
mombasa;Mombasa;kilwa;2;0;39.5;-3.5;spices;east_africa
amhara;Amhara;ethiopia;3;1;38.5;11.6;grain;east_africa
tigray;Tigray;ethiopia;2;0;39.0;14.0;cattle;east_africa
harar;Adal;adal;2;0;42.1;9.3;cattle;east_africa
delhi;Delhi;delhi;5;1;77.2;28.65;cotton;india
lahore;Punjab;delhi;3;0;74.3;31.55;grain;india
jaunpur;Jaunpur;jaunpur;3;0;82.7;25.75;grain;india
gaur;Bengal;bengal;5;0;88.4;24.0;silk;india
ahmedabad;Gujarat;gujarat;4;1;72.6;23.0;cotton;india
mandu;Malwa;malwa;3;1;75.4;22.5;cotton;india
chittor;Mewar;mewar;2;2;74.6;24.9;horses;india
thatta;Sindh;sindh;2;0;68.0;25.5;cotton;india
srinagar;Kashmir;kashmir;2;0;74.8;34.1;wool;india
bidar;Bahmani;bahmani;4;1;77.5;17.9;cotton;india
goa;Goa;bahmani;2;0;74.0;15.5;spices;india
hampi;Vijayanagara;vijayanagara;5;2;76.5;15.3;gold;india
coromandel;Coromandel;vijayanagara;3;0;79.8;12.5;cotton;india
calicut;Calicut;calicut;3;0;75.8;11.25;spices;india
cuttack;Orissa;orissa;3;1;85.9;20.5;grain;india
kotte;Ceylon;kotte;2;0;80.6;7.3;spices;india
tobolsk;Siberia;natives;1;0;68.25;58.2;furs;siberia
yakutsk;Yakutia;natives;1;0;129.7;62.0;furs;siberia
okhotsk;Far East;natives;1;0;140.0;55.0;furs;siberia
cuba;Cuba;natives;1;0;-79.5;21.8;sugar;caribbean
hispaniola;Hispaniola;natives;2;0;-71.0;19.0;sugar;caribbean
jamaica;Jamaica;natives;1;0;-77.3;18.1;sugar;caribbean
florida;Florida;natives;1;0;-81.7;28.5;furs;north_america
carolina;Carolinas;natives;1;0;-79.5;35.0;cotton;north_america
virginia;Chesapeake;natives;1;0;-77.0;38.0;timber;north_america
newengland;New England;natives;1;0;-71.5;42.5;fish;north_america
quebec;St Lawrence;natives;1;0;-71.5;47.0;furs;north_america
lakes;Great Lakes;natives;1;0;-84.0;44.0;furs;north_america
cahokia;Mississippi;natives;1;0;-90.2;38.6;grain;north_america
plains;Great Plains;natives;1;0;-100.0;41.0;cattle;north_america
texas;Texas;natives;1;0;-98.0;31.0;cattle;north_america
california;California;natives;1;0;-120.0;37.0;gold;north_america
oregon;Oregon;natives;1;0;-122.5;45.5;timber;north_america
hudson;Hudson Bay;natives;1;0;-95.0;56.0;furs;north_america
alaska;Alaska;natives;1;0;-150.0;63.0;furs;north_america
tenochtitlan;Tenochtitlan;aztec;5;2;-99.1;19.4;gold;mexico
veracruz;Veracruz;aztec;3;0;-96.6;19.2;cotton;mexico
oaxaca;Oaxaca;aztec;3;0;-96.7;17.05;silver;mexico
michoacan;Michoacán;tarascan;3;1;-101.6;19.6;silver;mexico
chichimeca;Chichimeca;natives;1;0;-103.0;24.0;silver;mexico
yucatan;Yucatán;maya;2;0;-89.0;20.5;cotton;mexico
guatemala;Guatemala;maya;2;0;-90.5;15.0;cotton;mexico
panama;Panama;natives;1;0;-80.0;8.5;gold;andes
venezuela;Venezuela;natives;1;0;-67.0;9.0;cattle;andes
quito;Quito;inca;3;1;-78.5;-0.2;gold;andes
chanchan;Chimor;chimor;3;1;-78.0;-8.5;cotton;andes
cusco;Cusco;inca;5;2;-72.0;-13.5;gold;andes
potosi;Charcas;inca;2;0;-65.75;-19.6;silver;andes
chile;Chile;natives;1;0;-71.0;-34.0;gold;andes
guiana;Guiana;natives;1;0;-57.0;5.0;sugar;brazil
pernambuco;Pernambuco;natives;1;0;-36.5;-8.0;sugar;brazil
bahia;Bahia;natives;1;0;-40.0;-12.5;sugar;brazil
rio;Rio de Janeiro;natives;1;0;-43.5;-22.5;sugar;brazil
saopaulo;São Paulo;natives;1;0;-47.5;-23.0;cattle;brazil
amazon;Amazonia;natives;1;0;-60.0;-4.0;timber;brazil
paraguay;Paraguay;natives;1;0;-57.5;-24.0;cattle;plata
plata;Río de la Plata;natives;1;0;-60.0;-33.5;cattle;plata
patagonia;Patagonia;natives;1;0;-68.0;-44.0;cattle;plata
sydney;New South Wales;natives;1;0;150.0;-31.0;cattle;oceania
perth;Western Australia;natives;1;0;117.0;-28.0;gold;oceania
outback;Australia;natives;1;0;134.0;-24.0;cattle;oceania
newzealand;New Zealand;natives;1;0;175.0;-39.0;timber;oceania
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
