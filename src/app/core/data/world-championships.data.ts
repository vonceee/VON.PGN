import { WorldChampionshipMatch } from '../models/world-championship.model';

export const WORLD_CHAMPIONSHIP_MATCHES: WorldChampionshipMatch[] = [
  {
    id: 'wcc-2024',
    year: 2024,
    title: '2024 World Chess Championship',
    champion: 'Ding Liren',
    challenger: 'Gukesh Dommaraju',
    winner: 'Gukesh Dommaraju',
    score: '7.5 - 6.5',
    format: '14 Classical Games + Tiebreaks',
    location: 'Resorts World Sentosa, Singapore',
    era: 'Modern Era (2006-Present)',
    description: '18-year-old Indian prodigy Gukesh Dommaraju defeated defending champion Ding Liren in Singapore to become the youngest classical World Chess Champion in history.',
    keyHighlights: [
      'Gukesh D became the youngest classical World Champion at age 18.',
      'Dramatic decisive games in rounds 1, 3, 11 and 14.',
      'Historic match marking the rise of the new Indian chess era.'
    ]
  },
  {
    id: 'wcc-2023',
    year: 2023,
    title: '2023 World Chess Championship',
    champion: 'Ian Nepomniachtchi',
    challenger: 'Ding Liren',
    winner: 'Ding Liren',
    score: '9.5 - 8.5 (rapid tiebreak)',
    format: '14 Classical Games + Rapid Tiebreaks',
    location: 'Astana, Kazakhstan',
    era: 'Modern Era (2006-Present)',
    description: 'Following Magnus Carlsen stepping down, Ding Liren defeated Ian Nepomniachtchi after a thrilling rapid tiebreak game 4 (7.5-6.5 classical), becoming China’s first World Chess Champion.',
    keyHighlights: [
      'Ding Liren became the 17th World Chess Champion.',
      'Famous 48...Ke7 move in game 4 of rapid tiebreak avoiding forced draws.',
      'High decisive game ratio in classical portion.'
    ]
  },
  {
    id: 'wcc-2021',
    year: 2021,
    title: '2021 World Chess Championship',
    champion: 'Magnus Carlsen',
    challenger: 'Ian Nepomniachtchi',
    winner: 'Magnus Carlsen',
    score: '7.5 - 3.5',
    format: '14 Classical Games',
    location: 'Dubai, UAE',
    era: 'Modern Era (2006-Present)',
    description: 'Magnus Carlsen defended his title for a fifth time, winning game 6 — the longest game in World Championship history at 136 moves — before pulling away with 4 wins in total.',
    keyHighlights: [
      'Game 6: Longest WCC game in history (136 moves, 7 hours 45 mins).',
      'Carlsen scored 4 wins and 7 draws.',
      'Carlsen’s final world title defense.'
    ]
  },
  {
    id: 'wcc-2018',
    year: 2018,
    title: '2018 World Chess Championship',
    champion: 'Magnus Carlsen',
    challenger: 'Fabiano Caruana',
    winner: 'Magnus Carlsen',
    score: '9.0 - 6.0 (3.0 - 0.0 rapid tiebreak)',
    format: '12 Classical Games + Rapid Tiebreaks',
    location: 'London, United Kingdom',
    era: 'Modern Era (2006-Present)',
    description: 'All 12 classical games ended in draws between the world #1 and #2. Carlsen dominated the rapid tiebreaks 3-0 to retain the crown.',
    keyHighlights: [
      'First WCC match where all classical games were drawn.',
      'Carlsen swept rapid tiebreak 3-0.',
      'Battle between #1 and #2 rated players.'
    ]
  },
  {
    id: 'wcc-2016',
    year: 2016,
    title: '2016 World Chess Championship',
    champion: 'Magnus Carlsen',
    challenger: 'Sergey Karjakin',
    winner: 'Magnus Carlsen',
    score: '9.0 - 7.0 (3.0 - 1.0 rapid tiebreak)',
    format: '12 Classical Games + Rapid Tiebreaks',
    location: 'New York City, USA',
    era: 'Modern Era (2006-Present)',
    description: 'Karjakin struck first in game 8, but Carlsen equalized in game 10 and secured the title on his birthday with a queen sacrifice finish (50. Qh6+!!) in game 4 of rapid tiebreak.',
    keyHighlights: [
      'Carlsen’s iconic 50. Qh6+!! queen sacrifice mate pattern.',
      'Karjakin’s formidable defensive skills nicknamed "Minister of Defense".',
      'Tied 6-6 in classical before rapid tiebreak.'
    ]
  },
  {
    id: 'wcc-2014',
    year: 2014,
    title: '2014 World Chess Championship',
    champion: 'Magnus Carlsen',
    challenger: 'Viswanathan Anand',
    winner: 'Magnus Carlsen',
    score: '6.5 - 4.5',
    format: '12 Classical Games',
    location: 'Sochi, Russia',
    era: 'Modern Era (2006-Present)',
    description: 'A rematch of 2013 where Anand qualified via Candidates. Carlsen defended his title with wins in Games 2, 6, and 11.',
    keyHighlights: [
      'Anand won game 3 in convincing style with White.',
      'Game 6 double blunder non-capitalization drama.',
      'Carlsen secured title with victory in game 11.'
    ]
  },
  {
    id: 'wcc-2013',
    year: 2013,
    title: '2013 World Chess Championship',
    champion: 'Viswanathan Anand',
    challenger: 'Magnus Carlsen',
    winner: 'Magnus Carlsen',
    score: '6.5 - 3.5',
    format: '12 Classical Games',
    location: 'Chennai, India',
    era: 'Modern Era (2006-Present)',
    description: 'Magnus Carlsen defeated 5-time champion Viswanathan Anand in Anand’s hometown without losing a game, starting the Carlsen Era in world chess.',
    keyHighlights: [
      'Carlsen won 3 games (Games 5, 6, and 9) with 7 draws.',
      'Carlsen became the 16th World Chess Champion.',
      'Marked a generational shift in global chess dominance.'
    ]
  },
  {
    id: 'wcc-2012',
    year: 2012,
    title: '2012 World Chess Championship',
    champion: 'Viswanathan Anand',
    challenger: 'Boris Gelfand',
    winner: 'Viswanathan Anand',
    score: '8.5 - 7.5 (2.5 - 1.5 rapid tiebreak)',
    format: '12 Classical Games + Rapid Tiebreaks',
    location: 'Moscow, Russia',
    era: 'Modern Era (2006-Present)',
    description: 'Tied 6-6 in classical games after Gelfand won Game 7 and Anand quickly struck back in Game 8. Anand won the rapid tiebreak 2.5-1.5 to retain his crown.',
    keyHighlights: [
      'Shortest decisive game in WCC history in Game 8 (Anand won in 17 moves).',
      'Anand’s 4th consecutive title defense.',
      'Tense rapid playoff in Tretyakov Gallery.'
    ]
  },
  {
    id: 'wcc-2010',
    year: 2010,
    title: '2010 World Chess Championship',
    champion: 'Viswanathan Anand',
    challenger: 'Veselin Topalov',
    winner: 'Viswanathan Anand',
    score: '6.5 - 5.5',
    format: '12 Classical Games',
    location: 'Sofia, Bulgaria',
    era: 'Modern Era (2006-Present)',
    description: 'Anand endured ash-cloud volcanic travel delays across Europe, lost game 1, but fought back and clinched the match in Game 12 with Black in Topalov’s home nation.',
    keyHighlights: [
      'Anand won the final Game 12 with Black to avoid tiebreaks.',
      'Volcanic eruption forced Anand on a 40-hour road trip to Sofia.',
      'Masterclass in preparation assisted by Kasparov and Kramnik.'
    ]
  },
  {
    id: 'wcc-2008',
    year: 2008,
    title: '2008 World Chess Championship',
    champion: 'Viswanathan Anand',
    challenger: 'Vladimir Kramnik',
    winner: 'Viswanathan Anand',
    score: '6.5 - 4.5',
    format: '12 Classical Games',
    location: 'Bonn, Germany',
    era: 'Modern Era (2006-Present)',
    description: 'Anand outprepared Kramnik with Black using the Semi-Slav Botvinnik & Meran variations, winning 3 classical games early to lock up the undisputed title.',
    keyHighlights: [
      'Anand became champion in all three formats (Tournament, Match, Knockout).',
      'Brilliant opening preparation with 14...Ng4 in Game 3 and 17...c5 in Game 5.',
      'Defeated Kramnik comfortably with 2 games to spare.'
    ]
  },
  {
    id: 'wcc-2007',
    year: 2007,
    title: '2007 World Chess Championship',
    champion: 'Vladimir Kramnik (Defending)',
    challenger: '8-Player Double Round-Robin',
    winner: 'Viswanathan Anand',
    score: '9.0 / 14 (+4 =10)',
    format: '8-Player Double Round-Robin',
    location: 'Mexico City, Mexico',
    era: 'Modern Era (2006-Present)',
    description: 'Viswanathan Anand played undefeated (9/14) ahead of Kramnik and Gelfand to win the Undisputed World Championship tournament.',
    keyHighlights: [
      'Anand undefeated performance (+4 =10).',
      'Anand became 15th Undisputed World Chess Champion.',
      'Predecessor to modern match system.'
    ]
  },
  {
    id: 'wcc-2006',
    year: 2006,
    title: '2006 World Chess Championship',
    champion: 'Vladimir Kramnik (Classical)',
    challenger: 'Veselin Topalov (FIDE)',
    winner: 'Vladimir Kramnik',
    score: '8.5 - 7.5 (2.5 - 1.5 rapid tiebreak)',
    format: '12 Classical Games + Rapid Tiebreaks',
    location: 'Elista, Russia',
    era: 'Modern Era (2006-Present)',
    description: 'The historic Reunification Match ending the 13-year split between Classical and FIDE titles. Kramnik defeated Topalov after tiebreaks despite the controversial "Toiletgate" dispute.',
    keyHighlights: [
      'Unified the World Chess Title after the 1993 split.',
      'Kramnik became 14th Undisputed World Champion.',
      'Dramatically tense rapid tiebreak victory.'
    ]
  },

  // Split Era (1993-2005)
  {
    id: 'wcc-2005',
    year: 2005,
    title: '2005 FIDE World Chess Championship',
    champion: '8-Player Tournament',
    challenger: 'Veselin Topalov',
    winner: 'Veselin Topalov',
    score: '10.0 / 14 (+6 =8)',
    format: '8-Player Double Round-Robin',
    location: 'San Luis, Argentina',
    era: 'Split Era (1993-2005)',
    description: 'Veselin Topalov produced an astonishing 6.5/7 first half to win the FIDE World Championship title ahead of Anand and Svidler.',
    keyHighlights: [
      'Topalov scored 6.5/7 in the first cycle.',
      'Won the tournament by 1.5 points margin.'
    ]
  },
  {
    id: 'wcc-2004-classical',
    year: 2004,
    title: '2004 Classical World Chess Championship',
    champion: 'Vladimir Kramnik',
    challenger: 'Peter Leko',
    winner: 'Vladimir Kramnik',
    score: '7.0 - 7.0 (Kramnik retained)',
    format: '14 Classical Games',
    location: 'Brissago, Switzerland',
    era: 'Split Era (1993-2005)',
    description: 'Kramnik was trailing Leko 6-7 going into the final game 14. In a must-win scenario with White, Kramnik delivered a crushing victory to draw the match 7-7 and retain his Classical title.',
    keyHighlights: [
      'Kramnik won Game 14 under intense pressure.',
      'Retained Classical World Championship title.',
      'Leko famously introduced opening novelties in Marshall Attack.'
    ]
  },
  {
    id: 'wcc-2000-classical',
    year: 2000,
    title: '2000 Classical World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Vladimir Kramnik',
    winner: 'Vladimir Kramnik',
    score: '8.5 - 6.5',
    format: '16 Classical Games',
    location: 'London, United Kingdom',
    era: 'Split Era (1993-2005)',
    description: 'In one of the biggest upsets in chess history, Kramnik used the impregnable Berlin Defense to neutralize Kasparov, defeating him 2.5-0.5 in decisive games without suffering a single loss.',
    keyHighlights: [
      'Kramnik ended Kasparov’s 15-year reign.',
      'Popularized the Berlin Defense (Ruy Lopez).',
      'Kasparov failed to win a single game.'
    ]
  },
  {
    id: 'wcc-1995-pca',
    year: 1995,
    title: '1995 PCA World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Viswanathan Anand',
    winner: 'Garry Kasparov',
    score: '10.5 - 7.5',
    format: '20 Classical Games',
    location: 'World Trade Center, New York, USA',
    era: 'Split Era (1993-2005)',
    description: 'Anand struck first in game 9, but Kasparov responded fiercely, winning 4 of the next 5 games to retain his PCA title atop the World Trade Center observation deck.',
    keyHighlights: [
      'Played on the 107th floor of 2 WTC, New York.',
      'Kasparov unleashed dragon-slaying Sicilian preparation.',
      '4 wins in 5 games turnaround by Kasparov.'
    ]
  },
  {
    id: 'wcc-1993-pca',
    year: 1993,
    title: '1993 PCA World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Nigel Short',
    winner: 'Garry Kasparov',
    score: '12.5 - 7.5',
    format: '24 Classical Games',
    location: 'London, United Kingdom',
    era: 'Split Era (1993-2005)',
    description: 'Kasparov and Short split from FIDE to form the Professional Chess Association (PCA). Kasparov dominated the match with 6 wins, 13 draws, and 1 loss.',
    keyHighlights: [
      'Formed the PCA split in chess history.',
      'Nigel Short became the first British WCC challenger.',
      'Kasparov secured match victory in game 20.'
    ]
  },

  // FIDE Soviet Era (1948-1990)
  {
    id: 'wcc-1990',
    year: 1990,
    title: '1990 World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Anatoly Karpov',
    winner: 'Garry Kasparov',
    score: '12.5 - 11.5',
    format: '24 Classical Games',
    location: 'New York City, USA & Lyon, France',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'The 5th and final Kasparov-Karpov match. Kasparov retained his crown in Lyon by a single point margin after winning Game 20 in memorable tactical fashion.',
    keyHighlights: [
      'Final chapter of the legendary K-K rivalry.',
      'Kasparov won Game 20 to take decisive lead.',
      'Matches split between USA and France.'
    ]
  },
  {
    id: 'wcc-1987',
    year: 1987,
    title: '1987 World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Anatoly Karpov',
    winner: 'Garry Kasparov',
    score: '12.0 - 12.0 (Kasparov retained)',
    format: '24 Classical Games',
    location: 'Seville, Spain',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Trailing 11-12 before game 24, Kasparov needed a win with White to retain his title. He delivered a tense positional win in game 24 to tie the match 12-12.',
    keyHighlights: [
      'Kasparov’s iconic Game 24 must-win victory.',
      '12-12 tie allowed Kasparov to retain title.',
      'Regarded as one of the most dramatic final games ever.'
    ]
  },
  {
    id: 'wcc-1986',
    year: 1986,
    title: '1986 World Chess Championship',
    champion: 'Garry Kasparov',
    challenger: 'Anatoly Karpov',
    winner: 'Garry Kasparov',
    score: '12.5 - 11.5',
    format: '24 Classical Games',
    location: 'London, UK & Leningrad, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Kasparov led by 3 points, Karpov mounted a comeback with 3 straight wins, but Kasparov steadied to win game 22 and win the rematch.',
    keyHighlights: [
      'Kasparov retained title in rematch.',
      'Karpov’s 3-game winning streak comeback attempt.',
      'Kasparov won game 22 with White.'
    ]
  },
  {
    id: 'wcc-1985',
    year: 1985,
    title: '1985 World Chess Championship',
    champion: 'Anatoly Karpov',
    challenger: 'Garry Kasparov',
    winner: 'Garry Kasparov',
    score: '13.0 - 11.0',
    format: '24 Classical Games',
    location: 'Moscow, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'At age 22, Garry Kasparov defeated Anatoly Karpov in game 24 with Black (Sicilian Scheveningen) to become the 13th World Champion and youngest champion in history.',
    keyHighlights: [
      'Kasparov became youngest World Champion at age 22.',
      'Game 16: Kasparov’s famous octopus knight on d3.',
      'Game 24: Kasparov won with Black to seal victory.'
    ]
  },
  {
    id: 'wcc-1984',
    year: 1984,
    title: '1984 World Chess Championship',
    champion: 'Anatoly Karpov',
    challenger: 'Garry Kasparov',
    winner: 'Unfinished / Aborted',
    score: '5 - 3 (40 draws)',
    format: 'First to 6 wins',
    location: 'Moscow, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'The longest WCC match in history lasting 48 games over 5 months. Karpov led 5-0, Kasparov ground out 40 draws and 3 wins before FIDE President Campomanes terminated the match without result.',
    keyHighlights: [
      '48 games played over 159 days.',
      'Aborted due to player exhaustion.',
      'Led to revised 24-game match format for 1985.'
    ]
  },
  {
    id: 'wcc-1981',
    year: 1981,
    title: '1981 World Chess Championship',
    champion: 'Anatoly Karpov',
    challenger: 'Viktor Korchnoi',
    winner: 'Anatoly Karpov',
    score: '6.0 - 2.0 (10 draws)',
    format: 'First to 6 wins',
    location: 'Merano, Italy',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Karpov convincingly defended his title against Soviet dissident Korchnoi in Merano, winning 6 games to 2 with 10 draws.',
    keyHighlights: [
      'Karpov’s 2nd successful defense against Korchnoi.',
      '"Massacre in Merano".',
      'Decisive 6-2 score in wins.'
    ]
  },
  {
    id: 'wcc-1978',
    year: 1978,
    title: '1978 World Chess Championship',
    champion: 'Anatoly Karpov',
    challenger: 'Viktor Korchnoi',
    winner: 'Anatoly Karpov',
    score: '6.0 - 5.0 (21 draws)',
    format: 'First to 6 wins',
    location: 'Baguio City, Philippines',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'A psychological battlefield in Baguio featuring parapsychologists and mirror sunglasses. Karpov led 5-2, Korchnoi tied 5-5, but Karpov won game 32 to win 6-5.',
    keyHighlights: [
      'Hosted in Baguio, Philippines.',
      'Wild psychological warfare off the board.',
      'Karpov won decisive game 32 after Korchnoi comeback.'
    ]
  },
  {
    id: 'wcc-1975',
    year: 1975,
    title: '1975 World Chess Championship',
    champion: 'Bobby Fischer',
    challenger: 'Anatoly Karpov',
    winner: 'Anatoly Karpov (Default)',
    score: 'Default (Forfeit)',
    format: 'First to 10 wins (Fischer proposed)',
    location: 'Manila, Philippines (Proposed)',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Bobby Fischer refused to defend his title after FIDE rejected his condition for retaining title on 9-9. Anatoly Karpov was declared the 12th World Champion by default.',
    keyHighlights: [
      'Only default in World Championship history.',
      'Anatoly Karpov became 12th World Champion.',
      'Fischer retired from competitive chess.'
    ]
  },
  {
    id: 'wcc-1972',
    year: 1972,
    title: '1972 World Chess Championship',
    champion: 'Boris Spassky',
    challenger: 'Bobby Fischer',
    winner: 'Bobby Fischer',
    score: '12.5 - 8.5',
    format: '24 Classical Games',
    location: 'Reykjavik, Iceland',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'The legendary Cold War "Match of the Century". Fischer lost game 1 and forfeited game 2, but stormed back with dominant play to break 24 years of Soviet hegemony.',
    keyHighlights: [
      'Fischer became 11th World Champion and 1st American.',
      'Global media sensation during the Cold War.',
      'Fischer won 7 games, Spassky won 3 (1 forfeit).'
    ]
  },
  {
    id: 'wcc-1969',
    year: 1969,
    title: '1969 World Chess Championship',
    champion: 'Tigran Petrosian',
    challenger: 'Boris Spassky',
    winner: 'Boris Spassky',
    score: '12.5 - 10.5',
    format: '24 Classical Games',
    location: 'Moscow, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Spassky returned for a second challenge against Iron Tigran Petrosian, winning 6 games to 4 to become the 10th World Champion.',
    keyHighlights: [
      'Spassky became 10th World Champion.',
      'Spassky’s universal attacking style overcame Petrosian’s defense.'
    ]
  },
  {
    id: 'wcc-1963',
    year: 1963,
    title: '1963 World Chess Championship',
    champion: 'Mikhail Botvinnik',
    challenger: 'Tigran Petrosian',
    winner: 'Tigran Petrosian',
    score: '12.5 - 9.5',
    format: '24 Classical Games',
    location: 'Moscow, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: 'Tigran Petrosian used prophylactic mastery to defeat Botvinnik (+5 =15 -2), ending the patriarch’s era as FIDE abolished rematch clauses.',
    keyHighlights: [
      'Petrosian became 9th World Champion.',
      'FIDE abolished automatic rematch clause after this match.'
    ]
  },
  {
    id: 'wcc-1960',
    year: 1960,
    title: '1960 World Chess Championship',
    champion: 'Mikhail Botvinnik',
    challenger: 'Mikhail Tal',
    winner: 'Mikhail Tal',
    score: '12.5 - 8.5',
    format: '24 Classical Games',
    location: 'Moscow, USSR',
    era: 'FIDE Soviet Era (1948-1990)',
    description: '23-year-old "Magician from Riga" Mikhail Tal dazzled the chess world with intuitive sacrificial combinations, defeating Botvinnik 6-2 in wins.',
    keyHighlights: [
      'Tal became youngest World Champion at the time (age 23).',
      'Electrifying tactical play amazed global audiences.'
    ]
  },

  // Early Classical Era (1886-1946)
  {
    id: 'wcc-1937',
    year: 1937,
    title: '1937 World Chess Championship',
    champion: 'Max Euwe',
    challenger: 'Alexander Alekhine',
    winner: 'Alexander Alekhine',
    score: '15.5 - 9.5',
    format: 'First to 6 wins',
    location: 'Netherlands',
    era: 'Early Classical (1886-1946)',
    description: 'Alekhine retook the World Championship crown in convincing fashion (+10 =11 -4), proving his preparation and physical condition.',
    keyHighlights: [
      'Alekhine regained title after losing in 1935.',
      'First player to regain World Championship match title.'
    ]
  },
  {
    id: 'wcc-1935',
    year: 1935,
    title: '1935 World Chess Championship',
    champion: 'Alexander Alekhine',
    challenger: 'Max Euwe',
    winner: 'Max Euwe',
    score: '15.5 - 14.5',
    format: 'First to 6 wins',
    location: 'Netherlands',
    era: 'Early Classical (1886-1946)',
    description: 'Dutch mathematics professor Max Euwe scored a famous upset over Alekhine to become the 5th World Chess Champion.',
    keyHighlights: [
      'Euwe became 5th World Chess Champion.',
      'First champion from the Netherlands.'
    ]
  },
  {
    id: 'wcc-1927',
    year: 1927,
    title: '1927 World Chess Championship',
    champion: 'José Raúl Capablanca',
    challenger: 'Alexander Alekhine',
    winner: 'Alexander Alekhine',
    score: '18.5 - 15.5 (6-3 in wins)',
    format: 'First to 6 wins',
    location: 'Buenos Aires, Argentina',
    era: 'Early Classical (1886-1946)',
    description: 'Alekhine shocked Capablanca after 34 grueling classical games (+6 =25 -3) to claim the crown in Buenos Aires.',
    keyHighlights: [
      'Alekhine defeated Capablanca having never won against him prior.',
      'Longest WCC match until 1984.'
    ]
  },
  {
    id: 'wcc-1921',
    year: 1921,
    title: '1921 World Chess Championship',
    champion: 'Emanuel Lasker',
    challenger: 'José Raúl Capablanca',
    winner: 'José Raúl Capablanca',
    score: '9.0 - 5.0 (4-0 in wins)',
    format: 'First to 8 wins or 24 games',
    location: 'Havana, Cuba',
    era: 'Early Classical (1886-1946)',
    description: 'Capablanca defeated Lasker in Havana without losing a single game (+4 =10 -0), ending Lasker’s record 27-year reign.',
    keyHighlights: [
      'Capablanca became 3rd World Champion.',
      'Ended Emanuel Lasker’s 27-year reign (1894–1921).'
    ]
  },
  {
    id: 'wcc-1894',
    year: 1894,
    title: '1894 World Chess Championship',
    champion: 'Wilhelm Steinitz',
    challenger: 'Emanuel Lasker',
    winner: 'Emanuel Lasker',
    score: '12.0 - 7.0 (10-5 in wins)',
    format: 'First to 10 wins',
    location: 'New York, Philadelphia, & Montreal',
    era: 'Early Classical (1886-1946)',
    description: '26-year-old mathematician Emanuel Lasker defeated 58-year-old Steinitz to start the longest reign in world championship history.',
    keyHighlights: [
      'Lasker became 2nd World Chess Champion.',
      'Lasker held the title for 27 years until 1921.'
    ]
  },
  {
    id: 'wcc-1886',
    year: 1886,
    title: '1886 World Chess Championship',
    champion: 'Wilhelm Steinitz',
    challenger: 'Johannes Zukertort',
    winner: 'Wilhelm Steinitz',
    score: '12.5 - 7.5 (10-5 in wins)',
    format: 'First to 10 wins',
    location: 'New York, St. Louis & New Orleans, USA',
    era: 'Early Classical (1886-1946)',
    description: 'The inaugural official World Chess Championship match. Wilhelm Steinitz rallied from 1-4 down to defeat Zukertort and become the first official World Champion.',
    keyHighlights: [
      'First official World Chess Championship match.',
      'Wilhelm Steinitz became 1st World Chess Champion.',
      'Formulated modern positional principles.'
    ]
  }
];
