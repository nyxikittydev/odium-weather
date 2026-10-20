plugins {
    id("com.android.application")
}

android {
    namespace = "com.odium.weather"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.odium.weather"
        minSdk = 21          // Android 5.0: first version with an updatable system WebView
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    lint { abortOnError = false }
}

// No dependencies: the UI is the web bundle in src/main/assets/www.
