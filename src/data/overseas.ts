// Discovery regions: parts of the world the player has not yet seen. Explorers reveal them;
// colonists then settle the native provinces inside, and conquerors take native empires.

export interface RegionDef {
  id: string; name: string; where: string; dist: 1 | 2 | 3; needs?: string[]; text: string;
}

export const REGIONS: Record<string, RegionDef> = {
  west_africa:     { id: 'west_africa', name: 'Guinea Coast', where: 'Africa', dist: 1, text: 'Rivers that carry gold dust to the sea, and kingdoms that trade it.' },
  central_africa:  { id: 'central_africa', name: 'Kongo and Angola', where: 'Africa', dist: 2, needs: ['west_africa'], text: 'The great river of Kongo and the coasts south of it.' },
  southern_africa: { id: 'southern_africa', name: 'Cape of Good Hope', where: 'Africa', dist: 2, needs: ['central_africa'], text: 'The southern tip of Africa. Beyond lies the Indian Ocean.' },
  east_africa:     { id: 'east_africa', name: 'Swahili Coast', where: 'Africa', dist: 3, needs: ['southern_africa'], text: 'Rich trading towns of coral stone, and Madagascar across the strait.' },
  india:           { id: 'india', name: 'The Indies', where: 'Asia', dist: 3, needs: ['east_africa', 'southern_africa'], text: 'Pepper, cotton, diamonds and the courts of great princes.' },
  east_indies:     { id: 'east_indies', name: 'Spice Islands', where: 'Asia', dist: 3, needs: ['india'], text: 'Cloves and nutmeg worth their weight in gold.' },
  china:           { id: 'china', name: 'Cathay and Cipangu', where: 'Asia', dist: 3, needs: ['east_indies', 'india'], text: 'The Ming empire, Korea and the islands of Japan.' },
  siberia:         { id: 'siberia', name: 'Siberia', where: 'Asia', dist: 3, needs: ['china'], text: 'Endless forests full of sable and fox.' },
  oceania:         { id: 'oceania', name: 'Terra Australis', where: 'Oceania', dist: 3, needs: ['east_indies'], text: 'The great southern land, long rumoured and never seen.' },
  caribbean:       { id: 'caribbean', name: 'The Antilles', where: 'New World', dist: 2, text: 'Islands beyond the Ocean Sea. The door to a New World.' },
  north_america:   { id: 'north_america', name: 'North America', where: 'New World', dist: 2, needs: ['caribbean'], text: 'Long coasts, deep forests and furs.' },
  mexico:          { id: 'mexico', name: 'Mexico', where: 'New World', dist: 2, needs: ['caribbean'], text: 'A great empire of lake cities, rich beyond belief.' },
  andes:           { id: 'andes', name: 'Peru', where: 'New World', dist: 3, needs: ['mexico', 'brazil'], text: 'An empire of mountain roads and temples of gold.' },
  brazil:          { id: 'brazil', name: 'Brazil', where: 'New World', dist: 2, text: 'Red-dye wood and endless coast.' },
  plata:           { id: 'plata', name: 'Río de la Plata', where: 'New World', dist: 3, needs: ['brazil'], text: 'A river so wide it looks like the sea.' },
};

/** Native empires: conquered with a Conquista, not settled. */
export const NATIVE_EMPIRES = ['aztec', 'tarascan', 'maya', 'inca', 'chimor'];
/** AI crowns that send colonists across the ocean, and when they start. */
export const COLONIAL_AI: Record<string, number> = { portugal: 1455, castile: 1495, aragon: 1510, england: 1530, france: 1530, burgundy: 1560, denmark: 1600, sweden: 1630, genoa: 1600 };
