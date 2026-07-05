import { CreatePinForm } from "../../components/create/CreatePinForm";

interface CreatePinPageProps {
  searchParams: Promise<{ lat?: string; lng?: string }>;
}

export default async function CreatePinPage({ searchParams }: CreatePinPageProps) {
  const params = await searchParams;
  const latitude = Number(params.lat);
  const longitude = Number(params.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <main className="app-page">
        <p className="app-error">Pick a location on the map first.</p>
      </main>
    );
  }

  return <CreatePinForm latitude={latitude} longitude={longitude} />;
}
