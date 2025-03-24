'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

interface MapProps {
  latitude: number
  longitude: number
  zoom?: number
  height?: string
}

export default function Map({ latitude, longitude, zoom = 13, height = '400px' }: MapProps) {
  if (!latitude || !longitude) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500 dark:text-gray-400">Aucune coordonnées disponibles</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>
          Position du chantier
        </Popup>
      </Marker>
    </MapContainer>
  )
} 