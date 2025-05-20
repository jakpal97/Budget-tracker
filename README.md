# Budget Tracker

Aplikacja do śledzenia budżetu i zarządzania wydatkami z funkcją skanowania paragonów.

## Funkcjonalności

- **Śledzenie wydatków**: Zapisuj i monitoruj swoje wydatki
- **Skanowanie paragonów**: Automatyczne rozpoznawanie danych z paragonów
- **Analiza budżetu**: Wykresy i statystyki wydatków
- **Kategorie wydatków**: Grupowanie wydatków według kategorii
- **Tryb ciemny/jasny**: Dostosuj wygląd aplikacji do swoich preferencji

## Technologie

- Next.js
- MongoDB
- NextAuth.js
- Chart.js
- Tesseract.js (OCR)
- EasyOCR (OCR poprzez Python)
- Sharp (przetwarzanie obrazów)

## Instalacja i uruchomienie lokalnie

1. Sklonuj repozytorium

   ```bash
   git clone https://github.com/twoje-konto/budget-tracker.git
   cd budget-tracker
   ```

2. Zainstaluj zależności

   ```bash
   npm install
   ```

3. Zainstaluj EasyOCR (opcjonalnie, wymaga Pythona)

   ```bash
   pip install easyocr
   ```

4. Utwórz plik `.env.local` i dodaj wymagane zmienne środowiskowe

   ```
   MONGODB_URI=mongodb+srv://...
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=twoj-tajny-klucz
   ```

5. Uruchom aplikację w trybie deweloperskim

   ```bash
   npm run dev
   ```

6. Otwórz [http://localhost:3000](http://localhost:3000) w przeglądarce

## Wdrożenie na Vercel

1. Utwórz konto na [Vercel](https://vercel.com/)

2. Zainstaluj Vercel CLI

   ```bash
   npm install -g vercel
   ```

3. Zaloguj się do Vercel

   ```bash
   vercel login
   ```

4. Wdróż aplikację

   ```bash
   vercel
   ```

5. Skonfiguruj zmienne środowiskowe w panelu Vercel:

   - `MONGODB_URI`
   - `NEXTAUTH_URL` (adres Twojej aplikacji po wdrożeniu)
   - `NEXTAUTH_SECRET`

6. Opcjonalnie, aby skonfigurować automatyczne wdrożenia, połącz repozytorium GitHub z projektem Vercel

## Funkcja OCR - skanowanie paragonów

Aplikacja oferuje dwie metody OCR do skanowania paragonów:

1. **Tesseract.js** - działa w przeglądarce, szybszy ale mniej dokładny
2. **EasyOCR** - wymaga Pythona, dokładniejszy ale wolniejszy

W środowisku produkcyjnym na Vercel:

- EasyOCR jest instalowany automatycznie podczas wdrażania
- Pliki tymczasowe są przechowywane w `/tmp`
- Przetwarzanie jest ograniczone czasowo do 60 sekund

## Znane problemy i ograniczenia

- Rozpoznawanie paragonów ma ograniczoną skuteczność (Tesseract ~60%, EasyOCR ~70%)
- Duże pliki obrazów mogą powodować problemy z przetwarzaniem
- W środowisku produkcyjnym czas przetwarzania jest ograniczony do 60 sekund

## Licencja

Ten projekt jest licencjonowany na warunkach licencji MIT.
