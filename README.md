# SAP Interview Practice

The complete app is in the standalone `index.html` file: markup, styles, SAP questions, and JavaScript are embedded in that file.

## Open and edit

- Run `dist/SAP-Interview-Practice-Setup-1.0.0.exe` to install the native Windows desktop app. The installer creates a Start menu entry and desktop icon; Node.js and an internet connection are not required to run the installed app. Windows may show a security warning because the installer is not code-signed.
- To create the Windows installer from source, install Node.js 22.12 or newer, run `npm install`, then run `npm run dist:win`. The installer is written to `dist/`.
- To build the Android APK, open the `android/` folder in Android Studio and build the `app` debug APK, or run `.\build-android.ps1`. The installable APK is written to `dist/SAP-Interview-Practice.apk`. The APK includes the study app for offline use; live community chat is available in the hosted web app.
- Use **Share App** in the app to share the installed APK on Android or the app link in a supported browser.
- Open `index.html` directly in a browser to use the app offline.
- To use the browser version or its optional browser shortcut, run `launch-app.bat` on Windows. It starts the local app at `http://127.0.0.1:3000` and installs its dependencies the first time; Node.js 18 or newer is required.
- In a supported browser, choose **Install App** when the button appears, or use the browser's **Install app** option in its menu. The installed app opens in its own window and can be pinned to the desktop or taskbar. Browser installation requires localhost or a secure HTTPS site.
- The app layout also adapts to phones and tablets. Open its HTTPS website on the device, then use **Add to Home Screen** (iPhone/iPad Safari: Share → Add to Home Screen; Android Chrome: menu → Install app or Add to Home screen). After the first online visit or install, the study app works offline; live community chat needs a connection.
- To publish the mobile app, push the project to GitHub, sign in to Render, and create a Blueprint from `render.yaml`. Render will build and host the app over HTTPS at the service URL it provides. On your phone or tablet, open that URL once and add it to the home screen using the steps above.
- Open `index.html` in a text editor or VS Code to edit the app.
- Notes, favorites, reviewed questions, theme, and local community messages are saved in that browser's local storage.
- When served by the Node.js app, community chat is live across connected visitors and up to 100 recent messages per SAP module are kept in server memory. Anyone with the public app URL can join without an account. Opening `index.html` directly falls back to local browser chat.
- FI Blog and CO Blog open full-screen windows with separate categories, category add/delete controls, Bold and larger-only text-size options; notes are saved per category in the browser.
- Question import supports modern Excel `.xlsx` files. Put questions in column A, answers in column B, and an optional category (FI, CO, General, etc.) in column C; a header row is optional. Legacy `.xls` files are not supported.

The former CSS, JavaScript, server, and module blog files are no longer loaded by the standalone app.
