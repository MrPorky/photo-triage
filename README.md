# Photo Triage App

A personal photo management app for Android 15+ that allows you to triage, edit, and organize photos from your device's camera.

## Features

- 📸 **Real DCIM/Camera Access**: Direct access to photos in your device's DCIM/Camera folder using Android's MediaStore API
- 🔄 **Photo States**: Manage photos through three states:
  - **Camera**: Original photos from DCIM/Camera (read-only)
  - **Pending**: Working copies ready for editing with version support
  - **Completed**: Final edited versions
- ✏️ **Version Management**: Create multiple versions while editing (e.g., `IMG_001.jpg`, `IMG_001~v2.jpg`, `IMG_001~v3.jpg`)
- 🎯 **Simple Actions**:
  - Mark photos as pending (copies to editing folder)
  - Complete photos (moves latest version to completed folder)
  - Remove from pending
- 🖼️ **Grid Gallery**: View all photos with visual status indicators
- 📱 **Full-screen Detail View**: Swipe between photos with action buttons

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: TanStack Router (file-based)
- **UI**: ShadCN + Tailwind CSS
- **Mobile**: Ionic Capacitor 7.4.4
- **Storage**: 
  - MediaStore API (Android 11+) for camera folder access
  - Capacitor Filesystem for app-specific folders
- **Custom Plugin**: Native Android plugin for MediaStore integration

## Project Structure

```
src/
├── components/
│   ├── Gallery.tsx          # Photo grid view
│   ├── PhotoDetail.tsx      # Full-screen photo view
│   └── ui/                  # ShadCN components
├── contexts/
│   └── PhotoContext.tsx     # Global photo state
├── services/
│   └── filesystem.ts        # File operations & MediaStore integration
├── plugins/
│   └── StorageAccess.ts  # TypeScript interface for native plugin
├── routes/
│   ├── __root.tsx          # Root layout
│   ├── index.tsx           # Gallery page
│   └── photos/
│       └── _photoId.tsx    # Photo detail page
└── types/
    └── photo.ts            # TypeScript types

android/app/src/main/java/photo/triage/
├── MainActivity.java                    # App entry point
└── plugins/
    └── StorageAccessPlugin.java      # Native MediaStore access
```

## Setup & Installation

### Prerequisites

- Node.js 18+ and pnpm
- Android Studio
- Android device/emulator running Android 11+ (API 30+)

### Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/MrPorky/photo-triage
   cd photo-triage
   pnpm install
   ```

2. **Build the web app**:
   ```bash
   pnpm build
   ```

3. **Sync with Android**:
   ```bash
   npx cap sync android
   ```

4. **Build and install on device**:
   ```bash
   cd android
   ./gradlew assembleDebug installDebug
   ```

   Or open in Android Studio:
   ```bash
   npx cap open android
   ```

### Building for Production

```bash
pnpm build
npx cap sync android
cd android
./gradlew assembleRelease
```

## How It Works

### MediaStore Integration

The app uses a custom Capacitor plugin to access photos via Android's MediaStore API:

1. **Native Plugin** (`StorageAccessPlugin.java`):
   - Queries MediaStore for photos/videos in DCIM/Camera
   - Returns metadata (name, size, URI, modified time)
   - Handles Android 11-15+ permissions (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO)

2. **TypeScript Interface** (`StorageAccess.ts`):
   - Provides type-safe access to native functionality
   - Methods: `checkPermissions()`, `requestPermissions()`, `getPhotos()`

3. **File Service** (`filesystem.ts`):
   - Loads photos from MediaStore (camera folder)
   - Manages pending/completed folders in app storage
   - Converts content URIs to web-accessible URLs using `Capacitor.convertFileSrc()`

### Photo Workflow

1. **Load Photos**: App queries MediaStore for all DCIM/Camera photos
2. **Mark as Pending**: Copy photo from camera to `PhotoTriage/Pending/` folder
3. **Edit**: Create versions in pending folder (manual editing outside app)
4. **Complete**: Move latest version to `PhotoTriage/Completed/` with original filename, delete all from pending

### Key Implementation Details

- **Content URIs**: Photos from MediaStore are accessed via `content://` URIs
- **URI Conversion**: `Capacitor.convertFileSrc()` converts content URIs to WebView-compatible URLs
- **Plugin Registration**: Native plugin must be registered in `MainActivity.onCreate()` **before** `super.onCreate()`
- **Permissions**: Declarative in `AndroidManifest.xml`, runtime requests handled by plugin
- **File Operations**: Use Capacitor Filesystem with no directory parameter for content URI reads

## Permissions

The app requires the following permissions (declared in `AndroidManifest.xml`):

- **Android 13+ (API 33+)**:
  - `READ_MEDIA_IMAGES`
  - `READ_MEDIA_VIDEO`
- **Android 11-12 (API 30-32)**:
  - `READ_EXTERNAL_STORAGE` (maxSdkVersion="32")

## Development Commands

```bash
# Install dependencies
pnpm install

# Development build
pnpm build

# Type checking
pnpm build  # Runs tsc

# Sync native code
npx cap sync android

# Open Android Studio
npx cap open android

# Build Android APK
cd android && ./gradlew assembleDebug

# Install on device
cd android && ./gradlew installDebug

# Clean build
cd android && ./gradlew clean
```

## Troubleshooting

### Plugin not found error
**Error**: `"StorageAccess" plugin is not implemented on android`

**Solution**: Ensure `registerPlugin(StorageAccessPlugin.class)` is called **before** `super.onCreate()` in `MainActivity.java`

### Photos not loading
1. Check permissions are granted in Android settings
2. Verify photos exist in DCIM/Camera folder (take a test photo)
3. Check Logcat for MediaStore query results: `adb logcat | grep StorageAccess`

### Content URI errors
**Error**: `Not allowed to load local resource: content://...`

**Solution**: Ensure `Capacitor.convertFileSrc()` is used to convert content URIs to WebView-compatible URLs

### Build errors
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
pnpm build
npx cap sync android
cd android
./gradlew assembleDebug
```

## Architecture Notes

### Why Custom Plugin?

Android 11+ (API 30+) introduced Scoped Storage restrictions that prevent direct access to DCIM/Camera via file paths. The MediaStore API is the official way to query and access media files, requiring a native Android plugin.

### Why Not Use Existing Plugins?

Existing Capacitor plugins don't provide direct MediaStore querying for specific folders. This custom plugin gives precise control over:
- Folder filtering (DCIM/Camera only)
- Permission handling (modern Android 13+ permissions)
- Content URI exposure to TypeScript layer

### Storage Locations

- **Camera Folder**: DCIM/Camera (read-only, accessed via MediaStore)
- **Pending Folder**: `/sdcard/PhotoTriage/Pending/` (app storage, read/write)
- **Completed Folder**: `/sdcard/PhotoTriage/Completed/` (app storage, read/write)

## License

Personal use project - not for distribution

## Credits

Built with:
- [Capacitor](https://capacitorjs.com/)
- [React](https://react.dev/)
- [TanStack Router](https://tanstack.com/router)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)