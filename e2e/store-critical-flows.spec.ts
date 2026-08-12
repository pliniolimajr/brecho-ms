import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const product = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Camisa de Linho E2E',
  tagline: 'Leve e elegante',
  description: 'Produto controlado pelo teste',
  long_description: 'Produto controlado pelo teste',
  price: 159.9,
  category: 'Camisetas',
  size: 'M',
  image_url: 'https://images.example.com/camisa.jpg',
  gallery: [],
  features: [],
  is_sold: false,
  brand: 'Palm CO.',
  color: ['Branco'],
  material: 'Linho',
  stock_quantity: 1,
};

async function mockExternalServices(page: Page) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 200, body: '' }));
  await page.route('https://images.example.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>',
  }));
  await page.route('https://viacep.com.br/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ erro: true }),
  }));
  await page.route('https://test.supabase.co/**', async route => {
    const url = route.request().url();
    if (url.includes('/rest/v1/products')) {
      const decodedUrl = decodeURIComponent(url).toLowerCase();
      const rows = decodedUrl.includes('produto inexistente') ? [] : [product];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': rows.length ? '0-0/1' : '*/0' },
        body: JSON.stringify(rows),
      });
    }
    if (url.includes('/functions/v1/subscribe-newsletter')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
    if (url.includes('/rest/v1/customers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: '30000000-0000-4000-8000-000000000001',
        user_id: '20000000-0000-4000-8000-000000000001',
        first_name: 'Maria', last_name: 'Silva', phone: '71999999999', cpf: '12345678909',
      }) });
    }
    if (url.includes('/rest/v1/admin_users')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
}

async function addAuthenticatedCheckoutState(page: Page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: '20000000-0000-4000-8000-000000000001',
    role: 'authenticated',
    email: 'maria@example.com',
    exp: expiresAt,
  })}.test-signature`;

  await page.addInitScript(({ session, cartProduct }) => {
    localStorage.setItem('sb-test-auth-token', JSON.stringify(session));
    localStorage.setItem('littlepalm-cart-storage', JSON.stringify({
      state: { cart: [cartProduct] },
      version: 0,
    }));
  }, {
    session: {
      access_token: accessToken,
      refresh_token: 'test-refresh-token',
      expires_at: expiresAt,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: '20000000-0000-4000-8000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'maria@example.com',
        app_metadata: {},
        user_metadata: {},
      },
    },
    cartProduct: {
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      price: product.price,
      category: product.category,
      size: product.size,
      imageUrl: product.image_url,
      features: [],
      stockQuantity: 1,
    },
  });
}

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious');
}

async function auditPage(page: Page) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  return seriousViolations(await new AxeBuilder({ page }).analyze());
}

test.beforeEach(async ({ page }) => {
  await mockExternalServices(page);
});

test('navega pelo catálogo e filtra produtos', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.getByRole('heading', { name: 'Coleção & Curadoria' })).toBeVisible();
  await expect(page.getByText('Camisa de Linho E2E')).toBeVisible();

  await page.getByPlaceholder('Buscar por nome, tecido, cor ou marca...').fill('produto inexistente');
  await expect(page.getByText('Camisa de Linho E2E')).not.toBeVisible();
});

test('visitante não acessa o painel administrativo', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Bem-vindo(a)' })).toBeVisible();
});

test('cadastro recusa CPF matematicamente inválido', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Criar uma conta' }).click();
  await page.getByLabel('CPF *').fill('11111111111');
  await page.getByLabel('CPF *').blur();
  await expect(page.getByText('CPF inválido. Verifique os dígitos digitados.')).toBeVisible();
});

test('checkout autenticado não avança com CPF inválido', async ({ page }) => {
  await addAuthenticatedCheckoutState(page);
  await page.goto('/checkout');
  const checkout = page.getByRole('main');
  await expect(checkout.getByRole('heading', { name: 'Finalizar Pedido' })).toBeVisible();

  await checkout.getByPlaceholder('Seu e-mail').fill('maria@example.com');
  await checkout.getByPlaceholder('Nome', { exact: true }).fill('Maria');
  await checkout.getByPlaceholder('Sobrenome').fill('Silva');
  await checkout.getByPlaceholder('(00) 00000-0000').fill('71999999999');
  await checkout.getByPlaceholder('000.000.000-00').fill('11111111111');
  await checkout.getByRole('button', { name: 'Prosseguir para Entrega' }).click();

  await expect(page.getByText('CPF inválido.')).toBeVisible();
  await expect(checkout.getByText('Endereço de Entrega')).not.toBeVisible();
});

test('newsletter usa a função protegida e confirma o cadastro', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Nome').fill('Maria');
  await page.getByPlaceholder('E-mail').fill('MARIA@EXAMPLE.COM');

  const requestPromise = page.waitForRequest(request => request.url().includes('/functions/v1/subscribe-newsletter'));
  await page.getByRole('button', { name: 'Assinar' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ name: 'Maria', email: 'maria@example.com' });
  await expect(page.getByText('Cadastro realizado com sucesso!')).toBeVisible();
});

test('retorno de pagamento recusado permite tentar novamente', async ({ page }) => {
  await page.goto('/checkout-failure');
  await expect(page.getByRole('heading', { name: 'Pagamento Recusado' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar Novamente' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=(?:%2F|\/)checkout$/);
});

for (const viewport of [
  { name: 'mobile-320', width: 320, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`catalogo sem violacoes graves de acessibilidade em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/catalogo');
    await expect(page.getByText('Camisa de Linho E2E')).toBeVisible();
    expect(await auditPage(page)).toEqual([]);
  });
}

test('produto sem violacoes graves de acessibilidade em mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/produto/${product.id}`);
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  expect(await auditPage(page)).toEqual([]);
});

test('carrinho aberto sem violacoes graves de acessibilidade', async ({ page }) => {
  await addAuthenticatedCheckoutState(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sacola de compras' }).click();
  await expect(page.getByRole('dialog', { name: /Seu Carrinho/ })).toBeVisible();
  expect(await auditPage(page)).toEqual([]);
});

test('checkout sem violacoes graves de acessibilidade', async ({ page }) => {
  await addAuthenticatedCheckoutState(page);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Finalizar Pedido' })).toBeVisible();
  expect(await auditPage(page)).toEqual([]);
});

test('minha conta sem violacoes graves de acessibilidade', async ({ page }) => {
  await addAuthenticatedCheckoutState(page);
  await page.goto('/minha-conta');
  await expect(page.getByText('Dados Pessoais')).toBeVisible();
  expect(await auditPage(page)).toEqual([]);
});

test('painel administrativo sem violacoes graves de acessibilidade', async ({ page }) => {
  await addAuthenticatedCheckoutState(page);
  await page.route('https://test.supabase.co/rest/v1/admin_users**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'admin-1' }),
  }));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Painel de Controle' })).toBeVisible();
  expect(await auditPage(page)).toEqual([]);
});
