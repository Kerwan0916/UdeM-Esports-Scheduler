'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MapImg from '/assets/images/mapview.png';

export default function MapViewPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-white  border hover:bg-[#dbcfa9] hover:text-[#0e0c1a] transition"
        >
          Back
        </button>

        <h1 className="text-xl font-semibold tracking-tight text-[#0e0c1a]">
          Computer Map View
        </h1>

        {/* spacer to keep title centered */}
        <span className="invisible rounded-full px-4 py-2 text-sm border">Back</span>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        {/* Image wrapper */}
        <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
          <Image
            src={MapImg}
            alt="Facility computer layout map"
            className="h-auto w-full"
            priority
          />
        </div>

        {/* Caption */}
        <p className="mt-3 text-sm text-neutral-600">
          Overview of all computers in the facility.
        </p>
      </div>
    </div>
  );
}
