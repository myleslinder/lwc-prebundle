export type DependencyInfo = {
  name: string;
  isNamespaced: boolean;
  isExternal: boolean;
  modules: {
    names: string[];
    isDefault: boolean;
  };
}

export type ProjectDependencyInfo = {
  [depName: string]: {
    isDefault: boolean;
    modules: string[];
  };
}

export type ComponentImportInfo = {
  cmpName: string;
  bundleName: string;
  fileName: string;
  fileExtension : string;
  pathname: string;
  fileContents: string;
  isCmpFile: boolean;
  imports: {
    statements: string[];
    dependencies: DependencyInfo[];
  };
}

export type ProjectImportInfo = {
  dependencies: ProjectDependencyInfo;
  components: { [cmpName: string]: ComponentImportInfo };
}
