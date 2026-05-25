import { fetchIpCityLocation } from "@imprint/api/mobile";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  OnboardingScaffold,
  PermissionCard
} from "../../src/components/onboarding";
import { setOnboardingCompleted } from "../../src/services/onboarding";

async function resolveCreatePinCoordinates() {
  const locationPermission = await Location.getForegroundPermissionsAsync();

  if (locationPermission.granted) {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude
      };
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    return {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    };
  }

  const ipCity = await fetchIpCityLocation();
  return ipCity.coordinates;
}

export default function OnboardingFirstMemoryScreen() {
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleCameraPermission = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setCameraGranted(permission.granted);
    if (!permission.granted) {
      setInlineError("Camera access is optional. You can still create your first memory now.");
      return;
    }

    setInlineError(null);
  };

  const handleLocationPermission = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(permission.granted);
    if (!permission.granted) {
      setInlineError("Location was denied, so Imprint will start you from a nearby city instead.");
      return;
    }

    setInlineError(null);
  };

  const handleDropFirstPin = async () => {
    setInlineError(null);
    setIsFinishing(true);

    try {
      if (locationGranted !== true) {
        const permission = await Location.requestForegroundPermissionsAsync();
        setLocationGranted(permission.granted);
      }

      if (cameraGranted === null) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        setCameraGranted(permission.granted);
      }

      const coordinates = await resolveCreatePinCoordinates();
      await setOnboardingCompleted(true);
      router.replace({
        pathname: "/create-pin",
        params: {
          latitude: String(coordinates.latitude),
          longitude: String(coordinates.longitude)
        }
      });
    } catch (error) {
      setInlineError(
        error instanceof Error
          ? error.message
          : "Imprint could not prepare your first memory right now."
      );
      setIsFinishing(false);
    }
  };

  return (
    <OnboardingScaffold
      body="Let Imprint set the stage, then drop your first pin."
      ctaLabel="Drop your first pin"
      footer={
        <View>
          <View className="gap-4">
            <PermissionCard
              description="So you can capture a memory the moment it happens."
              onPress={() => {
                void handleCameraPermission();
              }}
              stateLabel={cameraGranted ? "Allowed" : cameraGranted === false ? "Skipped" : "Pending"}
              title="Camera permission"
            />
            <PermissionCard
              description="So Imprint can open your first memory where you are."
              onPress={() => {
                void handleLocationPermission();
              }}
              stateLabel={
                locationGranted ? "Allowed" : locationGranted === false ? "Fallback city" : "Pending"
              }
              title="Location permission"
            />
          </View>
          {inlineError ? (
            <Text className="mt-4 text-center text-sm leading-6 text-amber-200">{inlineError}</Text>
          ) : null}
        </View>
      }
      isBusy={isFinishing}
      onCtaPress={() => {
        void handleDropFirstPin();
      }}
      title="Create your first memory"
      visual={
        <View className="w-full items-center">
          <View className="h-72 w-full overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 px-5 py-5">
            <View className="absolute left-6 top-6 h-32 w-32 rounded-full bg-sky-400/12" />
            <View className="absolute bottom-8 right-8 h-24 w-24 rounded-full bg-emerald-300/12" />
            <View className="mt-2 rounded-[28px] border border-white/10 bg-black/20 px-5 py-5">
              <Text className="text-sm font-medium uppercase tracking-[1.6px] text-sky-200">
                First pin
              </Text>
              <Text className="mt-3 text-3xl font-semibold text-white">
                Turn a place into the start of your story.
              </Text>
            </View>
            <View className="mt-5 rounded-[28px] border border-dashed border-sky-300/40 bg-sky-400/10 px-5 py-8">
              <Text className="text-center text-base leading-7 text-slate-200">
                Photo, note, date, chapter. One place. One remembered moment.
              </Text>
            </View>
          </View>
        </View>
      }
    />
  );
}
