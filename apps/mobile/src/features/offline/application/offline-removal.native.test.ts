import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeOfflineCity } from "./offline-removal.native";

const mocks=vi.hoisted(()=>({getPacks:vi.fn(),deletePack:vi.fn(),getManifest:vi.fn(),removeManifest:vi.fn(),files:new Set<string>(),calls:[] as string[]}));
vi.mock("@maplibre/maplibre-react-native",()=>({OfflineManager:{getPacks:mocks.getPacks,deletePack:mocks.deletePack}}));
vi.mock("../data/offline-storage",()=>({getStoredOfflineManifest:mocks.getManifest,removeOfflineManifest:mocks.removeManifest}));
vi.mock("./offline-download",()=>({getOfflineStyleDirectory:()=>({uri:"file:///styles"})}));
vi.mock("expo-file-system",()=>({File:class {uri:string;constructor(parent:{uri:string},name:string){this.uri=`${parent.uri}/${name}`;}get exists(){return mocks.files.has(this.uri);}delete(){mocks.files.delete(this.uri);}}}));

describe("native offline removal",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();mocks.files.clear();mocks.calls.length=0;
    mocks.getManifest.mockResolvedValue({download:{styleFileName:"new.json"}});
    mocks.getPacks.mockResolvedValue([{id:"old",metadata:{citySlug:"guaranda",styleFileName:"old.json"}},{id:"new",metadata:{citySlug:"guaranda",styleFileName:"new.json"}},{id:"other",metadata:{citySlug:"riobamba",styleFileName:"other.json"}}]);
    mocks.deletePack.mockImplementation(async(id:string)=>{mocks.calls.push(id);});
    mocks.removeManifest.mockImplementation(async()=>{mocks.calls.push("manifest");});
    for(const name of ["old.json","new.json","other.json"])mocks.files.add(`file:///styles/${name}`);
  });
  it("removes all city versions and local styles, preserving other cities",async()=>{
    await removeOfflineCity("guaranda");
    expect(mocks.calls).toEqual(["old","new","manifest"]);
    expect([...mocks.files]).toEqual(["file:///styles/other.json"]);
    expect(mocks.removeManifest).toHaveBeenCalledExactlyOnceWith("guaranda");
  });
  it("keeps metadata for retry if a native pack cannot be removed",async()=>{
    mocks.deletePack.mockRejectedValueOnce(new Error("database busy"));
    await expect(removeOfflineCity("guaranda")).rejects.toThrow("borrar toda");
    expect(mocks.removeManifest).not.toHaveBeenCalled();
  });
});
