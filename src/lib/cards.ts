export type Card = { id: string; src: string; label: string };

/** Enam kartu yang paling gampang dibedakan sekilas: empat As + dua Joker. */
export const deck: Card[] = [
  { id: "spades-ace", src: "/cards/spades-ace.png", label: "Ace of Spades" },
  { id: "hearts-ace", src: "/cards/hearts-ace.png", label: "Ace of Hearts" },
  { id: "diamonds-ace", src: "/cards/diamonds-ace.png", label: "Ace of Diamonds" },
  { id: "clubs-ace", src: "/cards/clubs-ace.png", label: "Ace of Clubs" },
  { id: "joker-red", src: "/cards/joker-red.png", label: "Red Joker" },
  { id: "joker-grey", src: "/cards/joker-grey.png", label: "Grey Joker" },
];

export const cardBack = "/cards/back.png";

/** Ukuran asli sprite (px). Diskalakan dengan kelipatan bulat biar tetap tajam. */
export const CARD_WIDTH = 37;
export const CARD_HEIGHT = 52;
/** Jarak antar kartu, dalam satuan sprite — ikut diskalakan. */
export const CARD_GAP = 8;
