import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadOfflineCity } from "./offline-download.native";

const mocks=vi.hoisted(()=>({createPack:vi.fn(),getPacks:vi.fn(),deletePack:vi.fn(),removeListener:vi.fn(),getManifest:vi.fn(),saveManifest:vi.fn(),loadStyles:vi.fn(),files:new Map<string,string>(),calls:[] as string[]}));
vi.mock("@maplibre/maplibre-react-native",()=>({OfflineManager:{createPack:mocks.createPack,getPacks:mocks.getPacks,deletePack:mocks.deletePack,removeListener:mocks.removeListener}}));
vi.mock("../data/offline-api",()=>({getOfflineCityManifest:mocks.getManifest}));
vi.mock("../data/offline-storage",()=>({saveOfflineManifest:mocks.saveManifest}));
vi.mock("@/features/map/data/basemap-style",()=>({loadOfflineMapStyles:mocks.loadStyles}));
vi.mock("expo-file-system",()=>({
  Paths:{document:{uri:"file:///documents"}},
  Directory:class {uri:string;constructor(parent:{uri:string},name:string){this.uri=`${parent.uri}/${name}`;}create(){}},
  File:class {uri:string;name:string;constructor(parent:{uri:string},name:string){this.uri=`${parent.uri}/${name}`;this.name=name;}write(value:string){mocks.files.set(this.uri,value);}get exists(){return mocks.files.has(this.uri);}delete(){mocks.files.delete(this.uri);}},
}));

const city={slug:"guaranda",name:"Guaranda",canton:"Guaranda",province:"Bolívar",latitude:-1.59,longitude:-79,package:{version:2,zoomMin:8,zoomMax:17,checksumSha256:null,publishedAt:null}};
const manifest={city,package:city.package,boundary:null,bounds:[-79.12,-1.71,-78.88,-1.47],centers:[],establishments:[],pois:[],routes:[]};
const styles={light:{version:8,sources:{},layers:[]},dark:{version:8,sources:{},layers:[]}};
const oldPack={id:"old",metadata:{citySlug:"guaranda",packageVersion:1}};
function makePack(size:number|null=13500){return{id:"new",metadata:{citySlug:"guaranda",packageVersion:2},status:vi.fn(async()=>({state:"complete",completedResourceSize:size}))};}

describe("native offline replacement",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();mocks.files.clear();mocks.calls.length=0;
    mocks.getManifest.mockResolvedValue(manifest);mocks.loadStyles.mockResolvedValue(styles);
    mocks.createPack.mockResolvedValue(makePack());mocks.getPacks.mockResolvedValue([oldPack,makePack()]);
    mocks.saveManifest.mockImplementation(async()=>{mocks.calls.push("save");});
    mocks.deletePack.mockImplementation(async(id:string)=>{mocks.calls.push(`delete:${id}`);});
  });
  it("downloads the normalized local style and swaps manifest before deleting old packs",async()=>{
    await downloadOfflineCity(city);
    const [options]=mocks.createPack.mock.calls[0];
    expect(options.mapStyle).toMatch(/^file:\/\/\/documents\/offline-map-styles\/.*\.json$/);
    expect(JSON.parse(mocks.files.get(options.mapStyle)!)).toEqual(styles.light);
    expect(options).toMatchObject({bounds:manifest.bounds,metadata:{citySlug:"guaranda",packageVersion:2}});
    expect(mocks.calls).toEqual(["save","delete:old"]);
    expect(mocks.saveManifest).toHaveBeenCalledWith(expect.objectContaining({download:expect.objectContaining({packId:"new",resourceSizeBytes:13500,mapStyles:styles,bounds:manifest.bounds})}));
  });
  it("rolls back only the new pack when saving fails, retaining the previous version",async()=>{
    mocks.saveManifest.mockRejectedValueOnce(new Error("disk full"));
    await expect(downloadOfflineCity(city)).rejects.toThrow("guardar la ciudad");
    expect(mocks.deletePack).toHaveBeenCalledExactlyOnceWith("new");
    expect(mocks.files.size).toBe(0);
    expect(mocks.getPacks).not.toHaveBeenCalled();
  });
  it("preserves the stored city if the new download fails",async()=>{
    const pack=makePack();pack.status.mockRejectedValueOnce(new Error("tile failure"));
    mocks.createPack.mockResolvedValueOnce(pack);
    await expect(downloadOfflineCity(city)).rejects.toThrow("tile failure");
    expect(mocks.saveManifest).not.toHaveBeenCalled();
    expect(mocks.deletePack).toHaveBeenCalledExactlyOnceWith("new");
    expect(mocks.files.size).toBe(0);
  });
  it("does not invent a resource size when MapLibre does not report one",async()=>{
    mocks.createPack.mockResolvedValueOnce(makePack(null));
    await downloadOfflineCity(city);
    expect(mocks.saveManifest).toHaveBeenCalledWith(expect.objectContaining({download:expect.objectContaining({resourceSizeBytes:null})}));
  });
  it("rejects a city mismatch before downloading tiles",async()=>{
    mocks.getManifest.mockResolvedValueOnce({...manifest,city:{...city,slug:"other"}});
    await expect(downloadOfflineCity(city)).rejects.toThrow("corresponde");
    expect(mocks.createPack).not.toHaveBeenCalled();
  });
});
