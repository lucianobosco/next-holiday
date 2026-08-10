# apps-script

The backend of the site's **feedback widget**. It is not part of the Astro build: it is a
versioned copy of the script that lives in **Google Apps Script**, bound to the "Feedback"
spreadsheet.

Its columns and the values the model writes are in Spanish, because the sheet is read in
Spanish and renaming them would orphan the columns that already exist.

## The flow

```
Widget (src/components/Feedback.tsx)
  --> POST (mode: 'no-cors', text/plain) to the Apps Script /exec URL
      --> doPost appends the row to the "Feedback" sheet
          --> a model classifies it (sentiment + category) and fills columns H and I
```

## Files

- `feedback.gs` — the code to paste into the Apps Script editor (Extensions → Apps Script).

## Setting it up

1. In the spreadsheet: **Extensions → Apps Script**.
2. Paste the contents of `feedback.gs`.
3. Paste your **Gemini API key** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
   into the `GEMINI_API_KEY` constant. **Only there, never in the repository.**
4. **Deploy → New deployment → Web app**, with access set to **"Anyone"**.
5. Copy the `/exec` URL into `ENDPOINT` in `src/components/Feedback.tsx`.
6. After any change to the code: **Deploy → Manage deployments → edit → New version**.

## Security

- The `GEMINI_API_KEY` **is not kept in the repository**: it exists only in the Apps Script
  editor, on Google's side, where no visitor to the site can see it.
- The `/exec` URL is public and write-only — it can append a row and nothing else — but
  there is no reason to advertise it.
