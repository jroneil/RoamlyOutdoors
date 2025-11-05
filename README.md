# Roamly Outdoors

Roamly Outdoors is a lightweight meetup-style application for outdoor communities. It is built with React, Vite and Firebase so you can quickly stand up an events hub backed by Cloud Firestore.

## Features

- 🧭 Browse upcoming, past or all adventures with search and tag filters.
- 🏕️ Create new events directly from the UI – submissions are written to your Firestore `events` collection.
- 🙋 RSVP to an event without an account and manage the attendee list in real time.
- 🔥 Powered entirely by Firebase so you can deploy the front end anywhere and keep your data in one place.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project** (or reuse an existing one) and enable **Cloud Firestore** in *Native* mode.

3. **Add a web app** in the Firebase console and copy the configuration values.

4. **Create a `.env.local` file** in the project root using the keys below. Replace the placeholders with the values from your Firebase console.

   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=0000000000
   VITE_FIREBASE_APP_ID=1:0000000000:web:abc123
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Vite defaults to [http://localhost:5173](http://localhost:5173). The app will connect to the Firestore instance associated with the credentials in your `.env.local` file.

## Firestore data model

Events are stored in the `events` collection with the following fields:

| Field         | Type              | Description                                           |
| ------------- | ----------------- | ----------------------------------------------------- |
| `title`       | `string`          | Name of the event                                     |
| `description` | `string`          | Long-form description for attendees                   |
| `location`    | `string`          | Meeting point or venue                                |
| `startDate`   | `Timestamp/Date`  | Start date/time                                       |
| `endDate`     | `Timestamp/Date`  | Optional end date/time                                |
| `hostName`    | `string`          | Host or organizing crew                               |
| `capacity`    | `number`          | Max attendees. Used to calculate remaining spots      |
| `tags`        | `string[]`        | Categories (e.g. `backpacking`, `trail-running`)      |
| `bannerImage` | `string (url)`    | Optional hero image shown on list/detail views        |
| `attendees`   | `string[]`        | List of attendee names (filled via RSVP form)         |
| `createdAt`   | `Timestamp`       | Timestamp generated with `serverTimestamp()`          |

The UI reads timestamps whether they are stored as Firestore `Timestamp`s or ISO strings, making local testing easier.

## Recommended Firestore security rules

Deploy the following Firestore rules to ensure the app can read events publicly while restricting writes to event data and RSVP
submissions to basic validation. You can paste these into the Firebase console under **Build → Firestore Database → Rules** or
deploy them with the Firebase CLI.

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;

      allow create: if request.resource.data.keys().hasOnly([
        'title', 'description', 'location', 'startDate', 'endDate', 'hostName',
        'capacity', 'tags', 'bannerImage', 'attendees', 'createdAt'
      ]) &&
        request.resource.data.title is string &&
        request.resource.data.description is string &&
        request.resource.data.location is string &&
        request.resource.data.hostName is string &&
        request.resource.data.capacity is int && request.resource.data.capacity > 0 &&
        request.resource.data.tags is list &&
        request.resource.data.createdAt == request.time;

      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['attendees']) &&
        request.resource.data.attendees is list &&
        request.resource.data.attendees.size() <= resource.data.capacity;
    }
  }
}
```

These rules let anyone browse events while ensuring only valid documents are created and that RSVP updates cannot exceed the
configured capacity. Adjust them to fit your authentication strategy if you later add user accounts or administrative flows.

## Scripts

| Command        | Description                                  |
| -------------- | -------------------------------------------- |
| `npm run dev`  | Start the Vite development server            |
| `npm run build`| Type-check and bundle the production build   |
| `npm run lint` | Run ESLint against the `src` directory       |

## Deployment

Because the project is a static Vite build, you can deploy it to any static hosting provider (Firebase Hosting, Netlify, Vercel, etc.). Just remember to supply the Firebase environment variables at build time.
