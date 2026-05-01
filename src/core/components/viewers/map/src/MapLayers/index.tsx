import { BimLayer } from './src/BimLayer'
import { CountryLayer } from './src/CountryLayer'
import { CommentLayer } from './src/CommentLayer'
import { SensorLayers } from './src/SensorsLayer'
import { FileLayers } from './src/FileLayer'
import { OpenDataLayers } from './src/OpenDataLayer/src'
import { BuildingLayer } from './src/BuildingLayers'

export const MapLayers = () => {
  return (
    <>
      <CountryLayer />
      <OpenDataLayers />
      <BuildingLayer />
      <CommentLayer />
      <SensorLayers />
      <FileLayers />
      <BimLayer />
    </>
  )
}
