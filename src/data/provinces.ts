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
bursa;Bursa;ottomans;4;1;29.05;40.2;silk;middle_east
izmir;Aydın;ottomans;3;0;27.4;38.45;oil;middle_east
ankara;Ankara;ottomans;3;1;32.85;39.95;wool;middle_east
sivas;Sivas;ottomans;2;0;37.0;39.75;horses;middle_east
konya;Konya;karaman;3;1;32.5;37.85;wool;middle_east
adana;Cilicia;karaman;2;0;35.3;37.0;cotton;middle_east
trebizond;Trebizond;trebizond;3;2;39.7;41.0;silk;middle_east
tbilisi;Georgia;georgia;2;1;44.8;41.7;wine;middle_east
cyprus;Cyprus;cyprus;2;1;33.3;35.1;sugar;middle_east
cairo;Cairo;mamluks;6;2;31.25;30.05;grain;north_africa
alexandria;Alexandria;mamluks;4;1;29.9;31.15;cotton;north_africa
aswan;Upper Egypt;mamluks;2;0;32.8;25.7;grain;north_africa
barqa;Cyrenaica;mamluks;1;0;21.8;32.3;horses;north_africa
jerusalem;Palestine;mamluks;3;1;35.2;31.75;oil;middle_east
damascus;Damascus;mamluks;4;1;36.3;33.5;silk;middle_east
aleppo;Aleppo;mamluks;4;1;37.15;36.2;cotton;middle_east
mecca;Hejaz;mamluks;3;0;39.8;21.45;spices;middle_east
diyarbakir;Diyarbakır;aqqoyunlu;3;1;40.2;37.9;wool;middle_east
mosul;Mosul;aqqoyunlu;2;0;43.1;36.35;cotton;middle_east
tabriz;Tabriz;qaraqoyunlu;4;1;46.3;38.05;silk;middle_east
baghdad;Baghdad;qaraqoyunlu;4;1;44.4;33.3;grain;middle_east
isfahan;Isfahan;qaraqoyunlu;4;0;51.65;32.65;silk;middle_east
shiraz;Fars;qaraqoyunlu;3;0;52.55;29.6;wine;middle_east
herat;Herat;timurids;4;1;62.2;34.35;silk;central_asia
mashhad;Khorasan;timurids;3;0;59.6;36.3;horses;central_asia
samarkand;Samarkand;timurids;5;1;66.95;39.65;silk;central_asia
bukhara;Bukhara;timurids;3;0;64.4;39.8;cotton;central_asia
kandahar;Kandahar;timurids;2;0;65.7;31.6;horses;central_asia
kazakh;Kazakh Steppe;uzbeks;1;0;68.0;47.0;horses;central_asia
hormuz;Hormuz;hormuz;3;1;56.3;27.2;spices;middle_east
muscat;Oman;oman;2;0;58.4;23.6;fish;middle_east
yemen;Yemen;yemen;2;0;44.2;15.35;spices;middle_east
najd;Najd;bedouins;1;0;46.7;24.6;horses;middle_east
fez;Fez;morocco;4;1;-5.0;34.05;wool;north_africa
marrakesh;Marrakesh;morocco;3;1;-8.0;31.6;sugar;north_africa
tangier;Tangier;morocco;2;1;-5.8;35.5;fish;north_africa
agadir;Sous;morocco;1;0;-9.5;30.4;sugar;north_africa
ceuta;Ceuta;portugal;1;2;-5.35;35.85;fish;north_africa
tlemcen;Tlemcen;tlemcen;3;1;-1.3;34.9;wool;north_africa
oran;Oran;tlemcen;2;0;-0.65;35.65;grain;north_africa
algiers;Algiers;tlemcen;2;0;3.05;36.7;fish;north_africa
tunis;Tunis;tunis;4;1;10.15;36.75;oil;north_africa
constantine;Constantine;tunis;2;0;6.6;36.3;grain;north_africa
bejaia;Béjaïa;tunis;2;0;5.05;36.7;timber;north_africa
kairouan;Kairouan;tunis;2;0;10.1;35.6;oil;north_africa
tripoli;Tripoli;tunis;2;1;13.2;32.85;salt;north_africa
fezzan;Fezzan;tribes;1;0;14.4;26.0;salt;north_africa
madeira;Madeira;portugal;1;0;-16.95;32.7;sugar;atlantic
azores;Azores;portugal;1;0;-25.6;37.8;grain;atlantic
canaries;Canary Islands;natives;1;0;-15.5;28.1;sugar;atlantic
`;

const TABLE_WORLD = `
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
nubia;Nubia;tribes;1;0;32.5;16.0;gold;east_africa
mogadishu;Mogadishu;natives;1;0;44.6;3.5;cattle;east_africa
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
beijing;Beijing;ming;6;2;116.4;39.9;silk;china
nanjing;Nanjing;ming;6;1;118.8;32.05;silk;china
hangzhou;Zhejiang;ming;5;0;120.15;29.5;silk;china
fuzhou;Fujian;ming;4;0;118.0;26.0;porcelain;china
guangzhou;Guangdong;ming;5;1;113.25;23.5;porcelain;china
wuhan;Huguang;ming;4;0;113.0;29.5;grain;china
chengdu;Sichuan;ming;4;0;104.0;30.6;silk;china
xian;Shaanxi;ming;4;1;108.9;34.3;grain;china
kunming;Yunnan;ming;2;0;102.7;25.05;silver;china
liaodong;Manchuria;jurchens;1;0;125.0;43.0;furs;china
karakorum;Mongolia;mongols;1;0;102.8;47.2;horses;china
lhasa;Tibet;tibet;2;0;91.1;29.65;wool;china
kashgar;Kashgar;mongols;1;0;76.0;39.5;horses;central_asia
hanseong;Korea;korea;4;1;127.0;37.55;grain;china
pyongyang;North Korea;korea;2;1;125.75;39.0;iron;china
kyoto;Kyoto;japan;5;1;135.75;35.0;silk;china
edo;Kanto;japan;3;1;139.7;35.7;grain;china
hakata;Kyushu;japan;3;1;130.4;33.6;silver;china
hanoi;Dai Viet;daiviet;4;1;105.85;21.0;grain;east_indies
champa;Champa;champa;2;0;108.5;14.0;spices;east_indies
angkor;Khmer;khmer;3;1;104.9;12.5;grain;east_indies
ayutthaya;Ayutthaya;ayutthaya;4;1;100.55;14.35;grain;east_indies
ava;Burma;ava;3;1;96.0;21.9;timber;east_indies
malacca;Malacca;malacca;3;1;102.25;2.3;spices;east_indies
pasai;Sumatra;natives;2;0;101.5;0.0;spices;east_indies
java;Java;majapahit;4;1;110.5;-7.4;spices;east_indies
brunei;Borneo;brunei;2;0;114.9;1.5;spices;east_indies
ternate;Maluku;ternate;2;0;127.6;-0.2;spices;east_indies
luzon;Philippines;natives;1;0;121.0;15.5;spices;east_indies
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
muisca;New Granada;natives;2;0;-74.1;5.0;gold;andes
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
