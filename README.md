<div align="center">
  <br />
  <img src="https://github.com/collabdt/docs/raw/main/static/img/cdt-logo.svg" alt="Collab Digital Twins Logo" height="72" />
  <br /><br />

  <h1>COLLAB DIGITAL TWINS</h1>

  <p><strong>Democratizing Digital Twin Technologies</strong></p>

  <p>
    <a href="https://collabdt.org">Website</a> ·
    <a href="https://docs.collabdt.org">Docs</a> ·
    <a href="https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform" target="_blank" rel="noopener">Beta Access</a> ·
    <a href="CONTRIBUTING.md">Contributing</a> ·
    <a href="https://collabdt.org/En/privacypolicy/">Privacy Policy</a>
  </p>

  <br />

  <a href="https://www.npmjs.com/package/@collabdt/core"><img src="https://img.shields.io/npm/v/@collabdt/core?style=flat-square&color=orange&label=%40collabdt%2Fcore" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/license-AGPL%203.0-orange?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-web-orange?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/data-sovereign-orange?style=flat-square" alt="Data Sovereign" />

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

Collab Digital Twins powers web-based, non-proprietary platforms for visualizing and interacting with multi-scale geospatial information systems (GIS), open data, and open building information modelling (BIM), alongside text, images, static and animated 3D models, IFCs, and point clouds.

The stack uses **React** for the interface, state management, and memory optimization, and **Next.js** for routing and server-side rendering, integrating open-source packages for maps and 3D. See the [architecture overview](https://docs.collabdt.org/docs/architecture/overview) for the full tech stack.

CDT fetches multi-scale open data (federal, provincial, municipal) directly from organizational APIs without local storage. It is not a system of record — it is a **framework for referencing and linking distributed data sources**.

An authentication system lets users form groups, assume roles with scoped credentials for controlled data and feature access, collaborate, and contribute media publicly or privately.

---

## Mission

CDT bridges BIM and GIS using open standards and free and open-source technologies, letting stakeholders visualize and analyze data directly in the browser without proprietary barriers.

The project is stewarded by [Collab Digital Twins](https://collabdt.org), a Canadian not-for-profit established to promote openness, innovation, and long-term public benefit.

---

## Deployment

CDT can be run in two ways, depending on how much infrastructure you want to manage. See the [Deployment overview](https://docs.collabdt.org/docs/deployment/overview) for full details.

- **[Self-Hosting](https://docs.collabdt.org/docs/deployment/self-hosting)** — run the full stack on your own infrastructure with Docker or Podman. You retain full control over data and configuration. Best for organizations with existing IT capacity that require data sovereignty or custom configuration. The [Services](https://docs.collabdt.org/docs/deployment/services) reference covers the components involved: PostgreSQL, MinIO, Martin/PostGIS, Node/Next.js, and the Open Data Service.
- **[CDT Hosted](https://docs.collabdt.org/docs/deployment/cdt-hosted)** — a fully managed SaaS deployment hosted in Canada, or an assisted deployment where the CDT team installs CDT on your infrastructure. Best for organizations with limited IT resources.

If you self-host CDT for others over a network, note the AGPL §13 source-availability obligation described under [Licensing](#licensing).

---

## Contributing

Community contributions are welcome.

- Read the [Contributor Guide](CONTRIBUTING.md) to get started.
- Read the [Contributor Terms](CONTRIBUTING.md#contributor-terms) and sign the [Contributor License Agreement (CLA)](CLA.md) before submitting.

Because CDT is dual-licensed (see [Licensing](#licensing)), every contributor signs the CLA. You keep the copyright in your contribution and grant Collab Digital Twins the right to distribute it under both the AGPL-3.0 and our commercial terms. You are prompted to sign automatically on your first pull request.

---

## Licensing

### Open source — AGPL-3.0

Free and open source under the **GNU Affero General Public License, version 3.0** ([full text](LICENSE) · [summary](https://www.gnu.org/licenses/agpl-3.0.en.html)). You may use, study, modify, and redistribute it under those terms at no cost.

The AGPL is a strong copyleft license with one obligation that is easy to miss: it applies to **anyone who runs the software as a network service** (AGPL §13). If you make CDT (modified or not) available to others over a network, those users must be able to obtain the *complete corresponding source code* of the exact version you run. In practice:

- **Self-hosting for others:** offer users the corresponding source, typically via a visible **"Source"** link in the running application pointing to the public repository at the deployed version.
- **Modifications:** any changes you distribute or host must also be licensed under AGPL-3.0.

If those terms work for you, self-host with no further obligation to us. For commercial licensing or a support agreement, contact **[info@collabdt.org](mailto:info@collabdt.org)**.

> Copyright © 2025 Collab Digital Twins. Distributed under AGPL-3.0; see [LICENSE](LICENSE) and third-party attributions in [NOTICE](NOTICE).

---

## Beta Access

To participate in the beta, complete the **[beta access form](https://docs.google.com/forms/d/e/1FAIpQLScB12Qc7khiOk4a_E753jDccx6026AjO-_FINBKoZZZtkmqnA/viewform)**. We review submissions and follow up with onboarding details.

---

<div align="center">
  <sub>Stewarded by a Canadian not-for-profit organization for long-term public benefit.</sub>
</div>
