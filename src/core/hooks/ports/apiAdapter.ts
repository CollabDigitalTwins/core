import type { Building, DbFile, Site, OpenDataPortal, DatasetGroup, User, Role, Organization, Comment, Sensor, Infrastructure, SensorType } from '../../../core/types/dbTypes'

export interface ApiAdapter {
    //Buildings
    getBuildings(): Promise<Building[]>
    getBuilding(id: number): Promise<Building | null>
    getBuildingsByOsm(osmId: number): Promise<Building[]>
    getBuildingsByFeatureId(featureId: string): Promise<Building[]>
    getBuildingOsmIds(): Promise<number[]>
    updateBuilding(id: number, patch: Partial<Building>): Promise<Building>
    createBuilding(input: { buildingData: Partial<Building>; organizationId: string }): Promise<Building>

    //Files
    listFiles(): Promise<DbFile[]>;
    listFile(id: number): Promise<DbFile>;
    updateFile(id: number, patch: Partial<DbFile>): Promise<DbFile>;
    listFilesByBuilding(buildingId: number, opts?: { tag?: string }): Promise<DbFile[]>;
    listFilesBySite(siteId: number, opts?: { tag?: string }): Promise<DbFile[]>;
    uploadFileToBuilding(buildingId: number, input: Partial<DbFile>): Promise<DbFile>;
    uploadFileToSite(siteId: number, input: Partial<DbFile>): Promise<DbFile>;
    uploadFileToUser(userId: number, input: Partial<DbFile>): Promise<DbFile>;
    deleteFile(fileId: number): Promise<DbFile>;

    //Open Data Portals
    listOpenDataPortals(): Promise<OpenDataPortal[]>;
    getOpenDataPortal(id: number): Promise<OpenDataPortal | null>;
    createOpenDataPortal(input: Partial<OpenDataPortal>): Promise<OpenDataPortal>;
    listOpenDataPortalsByMunicipality(municipality: string): Promise<OpenDataPortal[]>;
    listOpenDataPortalsByMunicipalityAndCountrySubdivision(municipality: string, countrySubdivision: string): Promise<OpenDataPortal[]>;
    listOpenDataPortalsByCountrySubdivision(countrySubdivision: string): Promise<OpenDataPortal[]>;
    listOpenDataPortalsByGroup(group: DatasetGroup): Promise<OpenDataPortal[]>;
    listOpenDataPortalsByName(name: string): Promise<OpenDataPortal[]>;

    //Sites
    listSites(): Promise<Site[]>;
    getSite(id: string): Promise<Site | null>;
    updateSite(id: string, patch: Partial<Site> & {
        siteBuildings?: {
        connect?: { id: number }[];
        disconnect?: { id: number }[];
        };
    }): Promise<Site>;
    createSite(input: Partial<Site>): Promise<Site>;
    deleteSite(id: string | number): Promise<Site>;

    //Users
    getUsers(): Promise<User[]>
    getUser(id: string): Promise<User | null>;
    updateUser(id: string, patch: Partial<User>): Promise<User>;
    deleteUser(id: string): Promise<User>;
    verifyUserPassword(id: string, password: string): Promise<boolean>;
    changeUserPassword(id: string, oldPassword: string, newPassword: string): Promise<User>;
    createUser(input: { userData: Partial<User> }): Promise<User>
    getUserRole(id: string): Promise<Role>;
    updateUserRole(userId: string, roleId: number): Promise<User>;

    //Organizations
    getOrganization(id: string): Promise<Organization | null>;
    updateOrganization(id: string, patch: Partial<Organization>): Promise<Organization>;
    getOrganizationByName(name: string): Promise<Organization | null>;
    getOrganizationRoles(orgId: string): Promise<Role[]>;

    //Comments
    getComments(): Promise<Comment[]>
    getCommentsByBuilding(buildingId: number): Promise<Comment[]>
    getComment(id: number): Promise<Comment>
    updateComment(id: number, patch: Partial<Comment>): Promise<Comment>
    deleteComment(id: number): Promise<Comment>
    createComment(input: { commentData: Partial<Comment>; }): Promise<Comment>
    getCommentsByAuthor(authorId: number): Promise<Comment[]>

    //Sensors
    getSensors(): Promise<Sensor[]>
    getSensorsByBuilding(buildingId: number): Promise<Sensor[]>
    getSensor(id: number): Promise<Sensor>
    updateSensor(id: number, patch: Partial<Sensor>): Promise<Sensor>
    deleteSensor(id: number): Promise<Sensor>
    createSensor(input: { sensorData: Partial<Sensor>; }): Promise<Sensor>
    getSensorsByAuthor(authorId: number): Promise<Sensor[]>

    //Sensor Types
    getSensorTypes(): Promise<SensorType[]>
    getSensorType(id: number): Promise<SensorType>
    updateSensorType(id: number, sensorTypeData: Partial<SensorType>): Promise<SensorType>
    deleteSensorType(id: number): Promise<SensorType>
    createSensorType(input: { sensorTypeData: Partial<SensorType>; }): Promise<SensorType>

    //Infrastructure
    listInfrastructure(): Promise<Infrastructure[]>;
    getInfrastructure(id: number): Promise<Infrastructure | null>;
    updateInfrastructure(id: number, patch: Partial<Infrastructure>): Promise<Infrastructure>;
    createInfrastructure(input: Partial<Infrastructure>): Promise<Infrastructure>;
    deleteInfrastructure(id: number): Promise<Infrastructure>;
    
}