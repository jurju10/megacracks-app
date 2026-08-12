// Canonical Megacracks 2026/27 checklist — single source of truth, shared by
// server (to validate/build state) and served to the client via GET /api/checklist.
//
// Fuente: checklist aportado por el usuario (cartas 1-450 confirmadas: ELITE, BASE,
// ENJOY, ZONA VIP, MASTER ROOKIE y STARS ON 25). Las cartas 451-513 no traían
// jugador ni equipo confirmado en la fuente, así que se incluyen como huecos
// "Pendiente" bajo la serie "Por Confirmar (451-513)" -- se pueden renombrar
// una a una en cuanto se sepa qué carta es cada número.

const TEAMS = {
    "Deportivo Alavés": [
      ["19","Escudo"],["20","Sivera"],["21","Pendiente"],["22","Jonny"],
      ["23","Tenaglia"],["24","Koski"],["25","Parada"],["26","Yusi"],
      ["27","Benavídez"],["28","Blanco"],["29","Guevara"],["30","Aleñá"],
      ["31","Pablo Ibáñez"],["32","Denis Suárez"],["33","Ángel Pérez"],["34","Abde"],
      ["35","Toni Martínez"],["36","Boyé"],
    ],
    "Athletic Club": [
      ["37","Escudo"],["38","Unai Simón"],["39","Padilla"],["40","Areso"],
      ["41","Vivian"],["42","Paredes"],["43","Laporte"],["44","Yuri"],
      ["45","Ruiz de Galarreta"],["46","Jauregizar"],["47","Rego"],["48","Sancet"],
      ["49","Nico Serrano"],["50","Berenguer"],["51","Robert Navarro"],["52","Williams"],
      ["53","Guruzeta"],["54","Nico Williams"],
    ],
    "Atlético de Madrid": [
      ["55","Escudo"],["56","Oblak"],["57","Musso"],["58","Marcos Llorente"],
      ["59","Le Normand"],["60","Pubill"],["61","Giménez"],["62","Hancko"],
      ["63","Ruggeri"],["64","Koke"],["65","Barrios"],["66","Johnny Cardoso"],
      ["67","Álex Baena"],["68","Almada"],["69","Giuliano"],["70","Lookman"],
      ["71","Julián Álvarez"],["72","Sørloth"],
    ],
    "FC Barcelona": [
      ["73","Escudo"],["74","Joan García"],["75","Szczęsny"],["76","Koundé"],
      ["77","Gerard Martín"],["78","Cubarsí"],["79","Eric García"],["80","Araujo"],
      ["81","Balde"],["82","De Jong"],["83","Marc Bernal"],["84","Gavi"],
      ["85","Pedri"],["86","Fermín"],["87","Dani Olmo"],["88","Raphinha"],
      ["89","Lamine Yamal"],["90","Ferran Torres"],
    ],
    "Real Betis": [
      ["91","Escudo"],["92","Valles"],["93","Pau López"],["94","Aitor Ruibal"],
      ["95","Bartra"],["96","Diego Llorente"],["97","Natan"],["98","Valentín Gómez"],
      ["99","Marc Roca"],["100","Amrabat"],["101","Fidalgo"],["102","Pablo Fornals"],
      ["103","Lo Celso"],["104","Isco"],["105","Riquelme"],["106","Antony"],
      ["107","Cucho Hernández"],["108","Abde"],
    ],
    "RC Celta": [
      ["109","Escudo"],["110","Radu"],["111","Iván Villar"],["112","Javi Rueda"],
      ["113","Álvaro Núñez"],["114","Javi Rodríguez"],["115","Starfelt"],["116","Marcos Alonso"],
      ["117","Carreira"],["118","Ilaix Moriba"],["119","Miguel Román"],["120","Hugo Álvarez"],
      ["121","Fer López"],["122","Swedberg"],["123","Pablo Durán"],["124","Iago Aspas"],
      ["125","Borja Iglesias"],["126","Jutglá"],
    ],
    "RC Deportivo": [
      ["127","Escudo"],["128","Álvaro Fernández"],["129","Germán Parreño"],["130","Adrià Altimira"],
      ["131","Loureiro"],["132","Noubi"],["133","Dani Barcia"],["134","Arnau Comas"],
      ["135","Quagliata"],["136","Villares"],["137","Riki"],["138","Mario Soriano"],
      ["139","José Ángel"],["140","Luismi Cruz"],["141","Mella"],["142","Yeremay"],
      ["143","Eddahchouri"],["144","Nsongo"],
    ],
    "Elche": [
      ["145","Escudo"],["146","Dituro"],["147","Pendiente"],["148","Pendiente"],
      ["149","Chust"],["150","Bigas"],["151","Affenbruger"],["152","Pedrosa"],
      ["153","Germán Valera"],["154","Gonzalo Villar"],["155","Martim Neto"],["156","Marc Aguado"],
      ["157","Pendiente"],["158","Morente"],["159","Pendiente"],["160","Diangana"],
      ["161","Yago Santiago"],["162","Cepeda"],
    ],
    "RCD Espanyol": [
      ["163","Escudo"],["164","Dmitrović"],["165","Fortuño"],["166","El Hilali"],
      ["167","Rubén Sánchez"],["168","Riedel"],["169","Cabrera"],["170","Miguel Rubio"],
      ["171","Pendiente"],["172","Urko"],["173","Pol Lozano"],["174","Edu Expósito"],
      ["175","Jofre"],["176","Dolan"],["177","Puado"],["178","Roberto Fernández"],
      ["179","Kike García"],["180","Pere Milla"],
    ],
    "Getafe": [
      ["181","Escudo"],["182","David Soria"],["183","Letáček"],["184","Kiko Femenía"],
      ["185","Djené"],["186","Boselli"],["187","Abqar"],["188","Zaid Romero"],
      ["189","Davinchi"],["190","Mario Martín"],["191","Javi Muñoz"],["192","Pendiente"],
      ["193","Pendiente"],["194","Pendiente"],["195","Borja Mayoral"],["196","Luis Vázquez"],
      ["197","Satriano"],["198","Álex Sancris"],
    ],
    "Levante": [
      ["199","Escudo"],["200","Ryan"],["201","Pablo Campos"],["202","Toljan"],
      ["203","Dela"],["204","Elgezabal"],["205","Pendiente"],["206","Manu Sánchez"],
      ["207","Oriol Rey"],["208","Arriaga"],["209","Pendiente"],["210","Pendiente"],
      ["211","Carlos Álvarez"],["212","Tunde"],["213","Brugué"],["214","Carlos Espí"],
      ["215","Pendiente"],["216","Etta Eyong"],
    ],
    "Real Madrid": [
      ["217","Escudo"],["218","Courtois"],["219","Lunin"],["220","Trent"],
      ["221","Militão"],["222","Huijsen"],["223","Rüdiger"],["224","Carreras"],
      ["225","Tchouaméni"],["226","Fede Valverde"],["227","Camavinga"],["228","Bellingham"],
      ["229","Güler"],["230","Brahim Díaz"],["231","Rodrygo"],["232","Mbappé"],
      ["233","Gonzalo"],["234","Vinícius"],
    ],
    "Málaga": [
      ["235","Escudo"],["236","Alfonso Herrero"],["237","Carlos López"],["238","Puga"],
      ["239","Murillo"],["240","Pendiente"],["241","Einar Galilea"],["242","Rafita"],
      ["243","Pendiente"],["244","Izan Merino"],["245","Dani Lorenzo"],["246","Rafa Rodríguez"],
      ["247","Dotor"],["248","Larrubia"],["249","Lobete"],["250","Adrián Niño"],
      ["251","Joaquín"],["252","Chupe"],
    ],
    "Osasuna": [
      ["253","Escudo"],["254","Sergio Herrera"],["255","Aitor Fernández"],["256","Rosier"],
      ["257","Boyomo"],["258","Catena"],["259","Herrando"],["260","Abel Bretones"],
      ["261","Iker Muñoz"],["262","Torró"],["263","Moncayola"],["264","Moi Gómez"],
      ["265","Rubén García"],["266","Aimar Oroz"],["267","Raúl Moro"],["268","Kike Barja"],
      ["269","Raúl García"],["270","Budimir"],
    ],
    "Racing de Santander": [
      ["271","Escudo"],["272","Pendiente"],["273","Eriksson"],["274","Mantilla"],
      ["275","Sangalli"],["276","Facu González"],["277","Javi Castro"],["278","Manu Herrando"],
      ["279","Jorge Salinas"],["280","Maguette"],["281","Gustavo Puertas"],["282","Íñigo"],
      ["283","Aldasoro"],["284","Suleiman"],["285","Andrés Martín"],["286","Guliashvili"],
      ["287","Villalibre"],["288","Íñigo Vicente"],
    ],
    "Rayo Vallecano": [
      ["289","Escudo"],["290","Batalla"],["291","Cárdenas"],["292","Ratiu"],
      ["293","Balliu"],["294","Lejeune"],["295","Nobel Mendy"],["296","Luiz Felipe"],
      ["297","Pep Chavarría"],["298","Pedro Díaz"],["299","Pathé Ciss"],["300","Óscar Valentín"],
      ["301","Unai López"],["302","Isi"],["303","Álvaro García"],["304","De Frutos"],
      ["305","Camello"],["306","Alemão"],
    ],
    "Real Sociedad": [
      ["307","Escudo"],["308","Remiro"],["309","Marrero"],["310","Aramburu"],
      ["311","Jon Martín"],["312","Zubeldia"],["313","Sergio Gómez"],["314","Aihen Muñoz"],
      ["315","Gorrotxategi"],["316","Turrientes"],["317","Pablo Martín"],["318","Pendiente"],
      ["319","Carlos Soler"],["320","Sučić"],["321","Barrenetxea"],["322","Guedes"],
      ["323","Kubo"],["324","Oyarzabal"],
    ],
    "Sevilla": [
      ["325","Escudo"],["326","Vlachodimos"],["327","Pendiente"],["328","Carmona"],
      ["329","Juanlu"],["330","Kike Salas"],["331","Nianzou"],["332","Castrín"],
      ["333","Suazo"],["334","Oso"],["335","Agoumé"],["336","Sow"],
      ["337","Vargas"],["338","Pendiente"],["339","Peque"],["340","Ejuke"],
      ["341","Akor Adams"],["342","Isaac Romero"],
    ],
    "Valencia": [
      ["343","Escudo"],["344","Dimitrievski"],["345","Rivero"],["346","Foulquier"],
      ["347","Diakhaby"],["348","Tárrega"],["349","Copete"],["350","Cömert"],
      ["351","Gayà"],["352","Pepelu"],["353","Guido Rodríguez"],["354","Javi Guerra"],
      ["355","Luis Rioja"],["356","Pendiente"],["357","Ramazani"],["358","Hugo Duro"],
      ["359","Diego López"],["360","Sadiq"],
    ],
    "Villarreal": [
      ["361","Escudo"],["362","Luiz Júnior"],["363","Arnau Tenas"],["364","Mouriño"],
      ["365","Pau Navarro"],["366","Foyth"],["367","Pendiente"],["368","Renato Veiga"],
      ["369","Sergi Cardona"],["370","Santi Comesaña"],["371","Maciá"],["372","Pape Gueye"],
      ["373","Moleiro"],["374","Buchanan"],["375","Pépé"],["376","Mikautadze"],
      ["377","Ayoze"],["378","Gerard Moreno"],
    ],
  };

const SPECIALS = {
    "Élite": [
      ["1","Barrios (Atlético)"],["2","Bellingham (Real Madrid)"],["3","Budimir (Osasuna)"],["4","Courtois (Real Madrid)"],
      ["5","Fede Valverde (Real Madrid)"],["6","Fermín (Barcelona)"],["7","Giuliano (Atlético)"],["8","Julián Álvarez (Atlético)"],
      ["9","Lamine Yamal (Barcelona)"],["10","Mbappé (Real Madrid)"],["11","Moleiro (Villarreal)"],["12","Nico Williams (Athletic)"],
      ["13","Oyarzabal (Real Sociedad)"],["14","Pablo Fornals (Betis)"],["15","Pedri (Barcelona)"],["16","Raphinha (Barcelona)"],
      ["17","Unai Simón (Athletic)"],["18","Vinícius (Real Madrid)"],
    ],
    "Enjoy": [
      ["379","Abde (Betis)"],["380","Brahim Díaz (Real Madrid)"],["381","Dani Olmo (Barcelona)"],["382","Dolan (Espanyol)"],
      ["383","Íñigo Vicente (Racing de Santander)"],["384","Kubo (Real Sociedad)"],["385","Lookman (Atlético)"],["386","Pépé (Villarreal)"],
      ["387","Vargas (Sevilla)"],
    ],
    "Zona Vip": [
      ["388","Antony (Betis)"],["389","Borja Iglesias (Celta)"],["390","Carlos Soler (Real Sociedad)"],["391","Cubarsí (Barcelona)"],
      ["392","De Frutos (Rayo)"],["393","Eric García (Barcelona)"],["394","Gavi (Barcelona)"],["395","Guedes (Real Sociedad)"],
      ["396","Güler (Real Madrid)"],["397","Hancko (Atlético)"],["398","Jauregizar (Athletic)"],["399","Joan García (Barcelona)"],
      ["400","Koke (Atlético)"],["401","Marcos Llorente (Atlético)"],["402","Mikautadze (Villarreal)"],["403","Oblak (Atlético)"],
      ["404","Pubill (Atlético)"],["405","Tchouaméni (Real Madrid)"],
    ],
    "Master Rookie": [
      ["406","Abdelkarim (Barcelona)"],["407","Antañón (Celta)"],["408","Carlos Espí (Levante)"],["409","Chupe (Málaga)"],
      ["410","Cubo (Atlético)"],["411","Dani Díaz (Real Sociedad)"],["412","Hugo López (Villarreal)"],["413","Joan Martínez (Real Madrid)"],
      ["414","Jorge Salinas (Racing de Santander)"],["415","Julio Díaz (Atlético)"],["416","Lamini Fati (Real Madrid)"],["417","Maciá (Villarreal)"],
      ["418","Rego (Athletic)"],["419","Thiago Pitarch (Real Madrid)"],["420","Tommy Marqués (Barcelona)"],["421","Tunde (Levante)"],
      ["422","Xavi Espart (Barcelona)"],["423","Yeremay (Deportivo)"],
    ],
    "Stars on 25": [
      ["424","MGK 25 Aniversario"],["425","Varios jugadores"],["426","Raúl (Real Madrid)"],["427","Xavi (Barcelona)"],
      ["428","Casillas (Real Madrid)"],["429","Puyol (Barcelona)"],["430","Zidane (Real Madrid)"],["431","Joaquín (Betis)"],
      ["432","Fernando Torres (Atlético)"],["433","Aduriz (Athletic)"],["434","Iniesta (Barcelona)"],["435","Villa (Valencia)"],
      ["436","Ronaldinho (Barcelona)"],["437","Jesús Navas (Sevilla)"],["438","Cazorla (Villarreal)"],["439","Forlán (Atlético)"],
      ["440","Messi (Barcelona)"],["441","Benzema (Real Madrid)"],["442","Cristiano Ronaldo (Real Madrid)"],["443","Griezmann (Atlético)"],
      ["444","Iago Aspas (Celta)"],["445","Modric (Real Madrid)"],["446","Neymar (Barcelona)"],["447","Oblak (Atlético)"],
      ["448","Oyarzabal (Real Sociedad)"],["449","Lamine Yamal (Barcelona)"],["450","Mbappé (Real Madrid)"],
    ],
    "Por Confirmar (451-513)": [
      ["451","Pendiente"],["452","Pendiente"],["453","Pendiente"],["454","Pendiente"],
      ["455","Pendiente"],["456","Pendiente"],["457","Pendiente"],["458","Pendiente"],
      ["459","Pendiente"],["460","Pendiente"],["461","Pendiente"],["462","Pendiente"],
      ["463","Pendiente"],["464","Pendiente"],["465","Pendiente"],["466","Pendiente"],
      ["467","Pendiente"],["468","Pendiente"],["469","Pendiente"],["470","Pendiente"],
      ["471","Pendiente"],["472","Pendiente"],["473","Pendiente"],["474","Pendiente"],
      ["475","Pendiente"],["476","Pendiente"],["477","Pendiente"],["478","Pendiente"],
      ["479","Pendiente"],["480","Pendiente"],["481","Pendiente"],["482","Pendiente"],
      ["483","Pendiente"],["484","Pendiente"],["485","Pendiente"],["486","Pendiente"],
      ["487","Pendiente"],["488","Pendiente"],["489","Pendiente"],["490","Pendiente"],
      ["491","Pendiente"],["492","Pendiente"],["493","Pendiente"],["494","Pendiente"],
      ["495","Pendiente"],["496","Pendiente"],["497","Pendiente"],["498","Pendiente"],
      ["499","Pendiente"],["500","Pendiente"],["501","Pendiente"],["502","Pendiente"],
      ["503","Pendiente"],["504","Pendiente"],["505","Pendiente"],["506","Pendiente"],
      ["507","Pendiente"],["508","Pendiente"],["509","Pendiente"],["510","Pendiente"],
      ["511","Pendiente"],["512","Pendiente"],["513","Pendiente"],
    ],
  };

function slug(s){
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function buildChecklist(){
  const list = [];
  const seen = {};
  function addGroup(team, entries){
    entries.forEach(([num, name]) => {
      let base = 'c-' + slug(team) + '-' + slug(num) + '-' + slug(name);
      let id = base, i = 2;
      while(seen[id]){ id = base + '-' + i; i++; }
      seen[id] = true;
      list.push({ id, num, name, team });
    });
  }
  Object.keys(TEAMS).forEach(team => addGroup(team, TEAMS[team]));
  Object.keys(SPECIALS).forEach(team => addGroup(team, SPECIALS[team]));
  return list;
}

const TEAM_ORDER = Object.keys(TEAMS).concat(Object.keys(SPECIALS));
const CHECKLIST = buildChecklist();
const CARD_BY_ID = {};
CHECKLIST.forEach(c => { CARD_BY_ID[c.id] = c; });

module.exports = { CHECKLIST, CARD_BY_ID, TEAM_ORDER, slug };
