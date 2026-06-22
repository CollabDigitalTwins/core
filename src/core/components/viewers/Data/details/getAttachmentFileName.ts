// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const getAttachmentFieldName = (tag: string): string => {
  const buildingTagToAttachmentField: Record<string, string> = {
    buildingCodeCompliance: 'buildingCodeComplianceBuildingId',
    environmentalCompliance: 'environmentalComplianceBuildingId',
    occupancyCertificate: 'occupancyCertificateBuildingId',
    permitsIssued: 'permitsIssuedBuildingId',
    systemAssessments: 'systemAssessmentsBuildingId',
    zoningCompliance: 'zoningComplianceBuildingId',
    certificationsFile: 'certificationsFileBuildingId',
    energyCodeCompliance: 'energyCodeComplianceBuildingId',
    fireSafety: 'fireSafetyBuildingId',
    maintenanceRecords: 'maintenanceRecordsBuildingId',
    proximityToServices: 'proximityToServicesBuildingId',
    regionalEnergyTrends: 'regionalEnergyTrendsBuildingId',
    bimModel: 'attachedFilesBuildingId',
    EnergyAssessmentReports: 'buildingEnergyAssessmentReports',
    AirQualityReports: 'buildingAirQualityReports',
    WaterQualityReports: 'buildingWaterQualityReports',
    DSRs: 'DSRs',
    BCAs: 'buildingBCAs',
    ContractorReports: 'buildingContractorReports',
    EngineeringAssessments: 'buildingEngineeringAssessments',
  }

  return buildingTagToAttachmentField[tag] || 'attachedFilesBuildingId'
}
