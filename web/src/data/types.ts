export type Phrase = {
  pt: string;
  en: string;
  note?: string;
};

export type Scenario = {
  id: string;
  title: string;
  titlePt: string;
  emoji: string;
  blurb: string;
  phrases: Phrase[];
};
