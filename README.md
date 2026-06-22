<div align="center">
  <br />
  <img src="https://github.com/collabdt/docs/raw/main/static/img/cdt-logo.svg" alt="Collab Digital Twins Logo" height="72" />
  <br /><br />

  <h1>COLLAB DIGITAL TWINS</h1>

  <p><strong>Democratizing Digital Twin Technologies</strong></p>

  <p>
    <a href="https://collabdt.org">Website</a> ·
    <a href="https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform" target="_blank" rel="noopener">Beta Access</a> ·
    <a href="CONTRIBUTING.md">Contributing</a> ·
    <a href="https://collabdt.org/privacypolicy">Privacy Policy</a>
  </p>

  <br />

  <img src="https://img.shields.io/badge/license-AGPL%203.0-orange?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-web-orange?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/data-sovereign-orange?style=flat-square" alt="Data Sovereign" />
  <img src="https://img.shields.io/badge/not--for--profit-Canadian-orange?style=flat-square" alt="Canadian not-for-profit" />

  <br /><br />

  <img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232a?style=flat-square&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/MapLibre-396CB2?style=flat-square" alt="MapLibre" />
  <img src="https://img.shields.io/badge/Three.js-black?style=flat-square&logo=three.js" alt="Three.js" />

  <br /><br />
  <hr />
  <br />
</div>

## What is CDT?

Collab Digital Twins is the technology to power web-based, non-proprietary platforms designed for the visualization and interaction of multi-scale geospatial information systems (GIS), open data, open building information modelling (BIM), and a wide range of other digital media — including text, images, animated and static 3D models, IFCs, and point clouds.

The technology is built with full-stack web development frameworks, using **React.js** for the user interface, state management, and memory optimization, and **Next.js** for file organization, routing, and server-side rendering (SSR). It integrates multiple open-source packages to support maps and 3D models:

| Layer | Technology |
|---|---|
| Web map renderer | MapLibre |
| Vector tile server | Martin (PostGIS) |
| 3D graphics | Three.js |
| IFC parsing | Web-IFC (That Open Company) — with IDS & BCF |
| Point cloud streaming | COPC / Potree |
| Object storage | MinIO |
| Database | PostgreSQL |
| Infrastructure | Fullhost (Canada) |

CDT efficiently incorporates multi-scale open data (federal, provincial, municipal), fetched directly from organizational APIs without requiring local data storage. Rather than functioning as a system of record, it serves as a **framework and infrastructure for referencing and linking distributed data sources**.

It also includes a robust authentication system that allows users to form groups, assume different roles and credentials for controlled data and feature access, collaborate effectively, and contribute diverse types of digital media, both publicly and privately.

---

## Mission

CDT bridges BIM and GIS using open standards and free and open-source technologies, enabling stakeholders to visualize and analyze data directly in the browser, thereby eliminating proprietary barriers.

CDT is stewarded by [Collab Digital Twins](https://collabdt.org) — a Canadian not-for-profit established to promote openness, innovation, and long-term public benefit. Our mission is to **democratize digital twin technologies**.

---

## Contributing

We welcome community contributions to this project.

- Read the [Contributor Guide](CONTRIBUTING.md) to get started.
- Read the [Contributor Terms](CONTRIBUTING.md#contributor-terms) and sign the [Contributor License Agreement (CLA)](CLA.md) before submitting.

Because CDT is dual-licensed (see [Licensing](#licensing) below), every contributor signs the CLA. You keep the copyright in your contribution and grant Collab Digital Twins the right to distribute it under both the AGPL-3.0 and our commercial terms. You'll be prompted to sign automatically on your first pull request.

---

## Licensing

Collab Digital Twins is **dual-licensed**.

### Open source — AGPL-3.0

The project is free and open source under the **GNU Affero General Public License, version 3.0** ([full text](LICENSE) · [plain-language summary](https://www.gnu.org/licenses/agpl-3.0.en.html)). You may use, study, modify, and redistribute it under those terms, at no cost.

The AGPL is a strong copyleft license with one obligation that is easy to miss — it applies to **anyone who runs the software as a network service** (AGPL §13). If you make CDT (modified or not) available to others over a network, those users must be able to obtain the *complete corresponding source code* of the exact version you are running. In practice:

- **Self-hosting for others:** you must offer your users the corresponding source — typically via a visible **"Source"** link in the running application that points to the public repository at the deployed version.
- **Modifications:** any changes you distribute or host must also be licensed under the AGPL-3.0.

If those terms work for you, you are free to self-host with no further obligation to us.

### Commercial license

If you cannot or prefer not to comply with the AGPL — for example, you want to embed CDT in a closed-source product, offer it as a hosted service without releasing your modifications, or need warranty, indemnity, and support terms — a separate **Commercial License Agreement** is available from Collab Digital Twins. Commercial licensing also helps fund the not-for-profit's public-benefit mission.

| | AGPL-3.0 (open source) | Commercial license |
|---|---|---|
| Cost | Free | Paid |
| Must release source of your modifications, including when hosted (§13) | Yes | No |
| Use in closed-source / proprietary products | No | Yes |
| Warranty, indemnity & guaranteed support | No (as-is, community) | Yes (per agreement) |

To discuss commercial licensing or a support agreement, contact **[support@collabdt.org](mailto:support@collabdt.org)**.

> Copyright © 2025 Collab Digital Twins. Distributed under AGPL-3.0; see [LICENSE](LICENSE) and third-party attributions in [NOTICE](NOTICE).

---

## 🚀 Beta Access

To participate in the beta, complete this short **[beta access form](https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform)**. We will review submissions and contact you with onboarding details.

---

<div align="center">
  <sub>Stewarded by a Canadian not-for-profit organization for long-term public benefit.</sub>
</div>
