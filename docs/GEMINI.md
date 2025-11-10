# Google Gemini setup for Mondo

Mondo can talk to Google Gemini for three types of AI calls:

- **Text generation** via the Generative Language API
- **Speech recognition** (audio transcription) via the Speech-to-Text API
- **Text-to-speech** voiceovers via the Text-to-Speech API

A single Google Cloud API key can authorise all of these requests once the
corresponding services are enabled on the same project. Follow the steps below
before switching the AI provider to Gemini inside the plugin settings.

## 1. Create a Google Cloud project (or reuse an existing one)

1. Visit <https://console.cloud.google.com/> and sign in.
2. Use the project selector in the top navigation bar to create a new project or
   choose the project you want to use with Mondo.

## 2. Enable the required APIs

With the desired project selected:

1. Open **APIs & Services → Library**.
2. Search for and enable the following APIs:
   - **Generative Language API** (Gemini models)
   - **Cloud Speech-to-Text API**
   - **Cloud Text-to-Speech API**

All three APIs must be enabled for Mondo to access text, transcription, and
voice synthesis.

## 3. Create an API key

1. Navigate to **APIs & Services → Credentials**.
2. Click **Create credentials → API key**.
3. Copy the generated key. This is the value you will paste into the Mondo
   settings.
4. (Recommended) Restrict the key to trusted domains or applications using the
   **API restrictions** section to prevent misuse.

## 4. Apply billing (if required)

Google may require billing to be enabled on the project before the APIs can be
called in production quantities. If prompted, attach a billing account under
**Billing** in the Cloud Console.

## 5. Add the key to Mondo

1. Open Obsidian → **Settings → Community Plugins → Mondo**.
2. Under **Audio Transcription**, set **Provider** to **Google Gemini**.
3. Paste the API key into the **API Key** field and save.

Once these steps are complete, Mondo will route transcription, text generation,
and text-to-speech calls through Gemini using your Google Cloud credentials.
