"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { PointCloudTable } from "./PointCloudTable";
import UploadPointCloudPage from "./PointCloudUploadPanel";

type StatusFilter = "all" | "uploaded" | "converted" | "not-converted";

enum PAGE {
  TABLE = "table",
  UPLOAD = "upload",
}

export function PointCloudManagementTable({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {
  const [currentPage, setCurrentPage] = React.useState<PAGE>(PAGE.TABLE)

  return(
    <div>
      {currentPage == PAGE.TABLE ?
        <PointCloudTable
          onUploadButtonClick = {() => setCurrentPage(PAGE.UPLOAD)}
          pointcloudApiUrl={pointcloudApiUrl}
        />
          :
        <UploadPointCloudPage
          onGoBackButtonClick = {() => setCurrentPage(PAGE.TABLE)}
          pointcloudApiUrl={pointcloudApiUrl}
        />
      }
    </div>
  )
}

