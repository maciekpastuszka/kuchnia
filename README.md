# Edytor kuchni

Lokalny edytor zabudowy kuchennej: rzut 2D ze ścianami i wymiarami + podgląd 3D (React, three.js / R3F, zustand).

```bash
npm install
npm run dev   # http://localhost:5181
```

## Założenia wymiarowe (domyślne, do zmiany w „Ustawieniach”)

| Element | Wymiar |
|---|---|
| Szafki dolne | cokół 10 + korpus 78 + blat 2 = **90 cm**, korpus gł. 51 (prowadnice 500 mm) |
| Blat konglomerat | 60 × 2 cm, **2 cm przed frontem**, luz za korpusem 5,2 cm |
| Materiały | szafki dolne: Egger H1386 ST40 dąb Casella brązowy, słoje pionowe; słupki i szafki górne: Egger U540 ST9 niebieski denim. Dąb: skan dekoru z egger.com w `public/textures/`; denim: jednolity kolor #86a5bc dobrany do zdjęcia realizacji (skan Egger wychodzi zbyt szary) |
| Uchwyty | płaskie owalne 96 mm (seria Kolory Płaskie, drzazgasklep.pl), bordo; dł. 144, szer. 18, wys. 24 mm – szafki dolne; słupki TIP-ON, szafki górne chwyt od dołu |
| Fronty | o 2 mm węższe z każdego boku od korpusu (4 mm między sąsiednimi), w pionie szczeliny 3 mm |
| 3 szuflady | fronty 18,5 / 29,3 / 29,3 cm (od góry) |
| Płyta Amica PC7511FT | 78 × 52,2 cm, wycięcie 75 × 49 (wg e-katalog – sprawdzić w instrukcji), szafka 90 cm |
| Zlew Franke BXX 210/110-68 | 72,5 × 45, komora 68,5 × 41 × 20, podwieszany, szafka min. 80 cm |
| Słupek z piekarnikiem | standardowy korpus 60 × gł. 51 z piekarnikiem, nad nim 2 osobne szafki górne, 5,2 cm od ściany jak szafki dolne, plecy wycięte przy piekarniku; fronty nakładane TIP-ON, piekarnik 88–147,5 cm, pod nim drzwiczki; szafki nad piekarnikiem z podziałem na 207,1 cm (linia frontów płytkich słupków); obok osobne płyty boczne 1,8 × 58 × 270 od ściany do lica frontów (od strony płytkich słupków z 2 kawałków w linii ich frontów i niższa o 12 cm – nad nią blenda w linii blendy nad słupkami) |
| Płytki słupek | dolna szafka + osobna szafka górna z blendą; 24 cm z frontem (korpus 22,2), dolny front 205,9 cm od 1 cm nad podłogą (góra na 206,9 cm – lico z drzwiami ukrytymi), cokół schowany za frontem, dwa korpusy, TIP-ON; na górze blenda 12 cm do boku słupka z piekarnikiem |
| Szafki górne | do sufitu, gł. 35 cm; front zakrywa korpus i płytę pod nim, dół frontu i spód płyty na 148 cm (58 cm nad blatem, linia góry piekarnika); płyta cofnięta 2 cm za front – chwyt za dolną krawędź |
| Zmywarka do zabudowy | 60 lub 45 cm, wnęka 88 cm → model XXL (86,5–92 cm) |
| Lodówka wolnostojąca | 60 × 65 cm, wysokość do ustawienia, ~5 cm luzu przy ścianie |
| Szafka podwieszana pod zlew | 60 × 46 cm, 1 szuflada (wys. 40, wycięcie U) lub 2 szuflady (wys. 55); góra na 85 cm, bez cokołu |
| Sufit | 270 cm, maskownica 2 cm |

Szafka pod płytą: przedni trawers pionowo, bez tylnego trawersu, plecy niższe o ~5 cm (wentylacja). Szafka zlewowa: przedni trawers pionowo.

## Mój układ (przycisk „Moja kuchnia (Z)”)

- Długa ściana 430,3 cm: lodówka (miejsce 75,3 cm), szafka 60, zlewowa 80 z jedną dużą szufladą, zmywarka 60, szuflady 90 z płytą (lewy bok 155 cm od prawej ściany), blenda 7 cm.
- Ściana pod 90° w dół, 224,5 cm: szafka ze ślepym narożnikiem wsunięta do rogu – korpus 88 (blenda 57,4 + drzwiczki 29,8, zawiasy lewe; drzwiczki od 5 cm za frontami długiej ściany, prawa krawędź w licu z 2. frontem górnym), szuflady 93,2 w licu z 2. szafką górną, słupek z piekarnikiem kończący się 250 cm od długiej ściany, nad nimi 2 szafki górne po 93,2 cm z podwójnymi drzwiczkami i pod nimi osobna płyta 186,4 × 31,2 × 1,8 cm.
- Pomieszczenie obok: prostokąt 185 × 120 cm (wewn.) za prawą ścianą kuchni, nad trzecią ścianą, ta sama wysokość sufitu. Szafki podwieszane w L w prawym górnym narożniku: na ścianie 120 cm szafka 120 z 2 szufladami, na ścianie 185 cm obok niej szafka 60 z 1 szufladą.
- Ściana pod 90° w prawo, 300 cm: płytkie słupki 30 / 60 / 30, gł. 25,5 cm – fronty w licu z płytą boczną słupka z piekarnikiem.

## Obsługa

- **Rysuj ściany** – klik = narożnik, liczba + Enter = dokładna długość, Shift = dowolny kąt, klik w pierwszy punkt zamyka obrys. Linia to lico ściany od strony kuchni.
- Meble przyciągają się do ścian (z luzem za szafkami dolnymi) i do siebie. `R` / `Shift+R` – obrót o 90°, `Del`, `Ctrl+D`, strzałki (Shift = 10 cm), `Ctrl+Z` / `Ctrl+Shift+Z`.
- Ponowne kliknięcie w to samo miejsce wybiera element pod spodem (np. blat pod szafką).
- **Miarka** (`M`) – klik początek, klik koniec; przyciąga do narożników i krawędzi mebli, płyt, frontów i ścian, Shift – poziomo/pionowo, Esc – przerwij, „Wyczyść pomiary” usuwa wszystkie.
- W 3D kliknięcie we front otwiera / zamyka drzwiczki, szuflady, klapę zmywarki i piekarnika, lodówkę.
- Projekt zapisuje się w `localStorage`; eksport/import JSON w panelu „Projekt”.
