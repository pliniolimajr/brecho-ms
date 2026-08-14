export interface TopBarSettings {
  text: string;
  visible: boolean;
}

export interface HeroSettings {
  imageUrl: string;
  title: string;
  subtitle: string;
  tagline: string;
  buttonText: string;
}

export interface StoreInfoSettings {
  name: string;
  document: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export const STORE_SETTINGS = {
  topBar: {
    text: "Novidades toda semana. Compre online com envio para todo o Brasil.",
    visible: true
  } as TopBarSettings,
  hero: {
    imageUrl: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&q=80&w=2000",
    title: "Palm CO.",
    subtitle: "Uma curadoria de peças singulares para vestir com intenção, presença e liberdade.",
    tagline: "CURADORIA BAIANA",
    buttonText: "Descobrir peças"
  } as HeroSettings,
  storeInfo: {
    name: "Palm CO.",
    document: "12.345.678/0001-90",
    address: "Rua das Palmeiras, 123",
    city: "Campo Grande",
    state: "MS",
    zipCode: "79000-000"
  } as StoreInfoSettings
};

export function useStoreSettings() {
  return {
    topBar: STORE_SETTINGS.topBar,
    hero: STORE_SETTINGS.hero,
    storeInfo: STORE_SETTINGS.storeInfo,
    loading: false,
    fetchSettings: async () => { },
    updateSetting: async () => true
  };
}
