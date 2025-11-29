# Health Notifier App

A desktop health reminder application built with Electron.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run the App**:
    ```bash
    npm start
    ```

## Features

-   **Dashboard**: Configure timer interval (45m/60m) and notification preferences.
-   **Overlay**: Full-screen "freeze" notification that appears on top of other windows.
-   **Exercises**: Displays text, audio, or video prompts.

## Adding Custom Assets

The app looks for media files in the `assets` folder.
Currently, `exercises.json` references:
-   `assets/neck-stretch.mp4`
-   `assets/eye-rest-guide.mp3`

Please create an `assets` folder in the root directory and add these files, or update `exercises.json` to point to your own media.
