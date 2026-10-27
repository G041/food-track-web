-- 28 restaurantes migrados de la v1 (G041/food-track-backend, prisma/dev.db), ya aprobados.
-- El trigger de inserción se desactiva para poder cargarlos como aprobados y sin autor.
alter table public.restaurants disable trigger restaurants_before_insert;

insert into public.restaurants (name, category, address, menu_url, latitude, longitude, status) values
  ('McDonald''s', 'comida-rapida', 'Av. Centenario 72, San Isidro', 'https://www.mcdonalds.com.ar/menu', -34.47343074994976, -58.51367704153985, 'approved'),
  ('KFC - Kentucky Fried Chicken', 'comida-rapida', 'San Justo', 'https://www.kfc.com.ar/menu', -34.50651451664569, -58.5240164365028, 'approved'),
  ('Garibaldi', 'restaurante', 'Rafael obligado 4899', 'https://garibaldirestaurante.com.ar/carta.php?id=1', -34.55180411796171, -58.42661023189075, 'approved'),
  ('Adelmo', 'bodegon', 'Dardo Rocha 1734, Martínez', 'https://owlqr.ar/adelmocartadigital/', -34.49058908670119, -58.52577736072993, 'approved'),
  ('Nobel Bar', 'bar', 'Avenida Martín Fierro 3290, Villa Gobernador Udaondo', 'https://drive.google.com/drive/u/0/folders/1exnhVNjRI7IjsJiATnzdRKdcDJoouG2S', -34.62531850123312, -58.6953001318877, 'approved'),
  ('Kansas San Isidro', 'restaurante', 'Av. del Libertador 15089, Acassuso', 'https://www.kansasgrillandbar.com.ar/menu/Menu_Kansas.pdf', -34.47545022336651, -58.49982097568937, 'approved'),
  ('Soffice', 'merienda', 'Martin y Omar 202, San Isidro', 'https://drive.google.com/file/d/1pISZ_GMRkkw4WjlbRW5sMZJCrFglD-ui/view', -34.47118473797904, -58.51181323189431, 'approved'),
  ('Blossom', 'merienda', 'Av. Maipú 2501, Olivos', 'https://drive.google.com/file/d/19PxUOEMpWMfwIT91IT5Pj5C07VqX_UCO/edit', -34.51212391349797, -58.4898121914205, 'approved'),
  ('El Ñandu', 'restaurante', 'San Isidro', 'https://www.elnandu.com.ar/menu-qr/', -34.47168103813663, -58.49438156073059, 'approved'),
  ('Vecino', 'merienda', 'Rioja 3053, Olivos', 'https://soymenu.com.ar/es/vecino', -34.50367550678049, -58.48641406072949, 'approved'),
  ('Italica', 'restaurante', 'Olga Cossettini 851, Puerto Madero', 'https://linkmylink.com/italica/madero/menu/menu.es.pdf', -34.60689928948385, -58.36413243188851, 'approved'),
  ('Vince', 'bar', 'Puerto madero', 'https://drive.google.com/file/d/1Qe0FORGRC0fOmcrI2d4hJL1qYiTd0Q4q/edit', -34.61679584354023, -58.36504153483875, 'approved'),
  ('La Voluntad', 'merienda', 'Bajo S.I.', 'https://menu.fu.do/lavoluntad4/qr-menu', -34.46213989733498, -58.50863198956767, 'approved'),
  ('Fabric Sushi', 'restaurante', 'Rosario Vera Peñaloza 475/485, Cdad. Autónoma de Buenos Aires', 'https://www.fabricsushi.com.ar/menu/', -34.61794720281682, -58.36090553854108, 'approved'),
  ('Temple', 'bar', 'Pasaje Peatonal, Juana Manuela Gorriti 867, Cdad. Autónoma de Buenos Aires', 'https://pedir.tucan.la/menu/templepuertomadero/Espa%C3%B1ol', -34.60737782245646, -58.36630077673065, 'approved'),
  ('Halo Restaurante', 'restaurante', 'Av. Paseo Colón 455, CABA, Ciudad Autónoma de Buenos Aires, Argentina', 'https://carta.avocaty.io/restaurante-halo', -34.61276165889814, -58.36964383040753, 'approved'),
  ('Tanta', 'restaurante', 'Esmeralda 938, Cdad. Autónoma de Buenos Aires', 'https://tanta.ar/menu/', -34.59727435117004, -58.37879113942912, 'approved'),
  ('El querandi', 'restaurante', 'Perú 322, Cdad. Autónoma de Buenos Aires', 'https://querandi.com.ar/menu/espanol/', -34.61173329383922, -58.37472508228046, 'approved'),
  ('Ol''Days', 'merienda', 'Olga Cossettini 1182, Cdad. Autónoma de Buenos Aires', 'https://drive.google.com/file/d/1dxj9sfYTfelr63tzsFPSZQvNa_pusOs9/view?fbclid=PAAaYin_T8fJUyiUyS3YDu6vFhUcAw6PJYxyQEtVkRYlerlhwKHLxVj72IaQk_aem_AeZcJXI2CJ-Fbj5pcs-qfzRNcOq7fdz7YXKj4e3vix920rr4dWBRndImkboI-cuto8Q', -34.611203869777, -58.36325898881107, 'approved'),
  ('Tostado Café Club', 'merienda', 'Av. Elvira Rawson de Dellepiane s/n, Cdad. Autónoma de Buenos Aires', 'https://tostadocafeclub.com/menu/Menu-Digital-May25.pdf', -34.6245452956087, -58.3591437485387, 'approved'),
  ('Mostaza', 'comida-rapida', 'Olga Cossettini 1695, Cdad. Autónoma de Buenos Aires', 'https://www.mostazaweb.com.ar/categoria_comida/mega-hamburguesas/', -34.61741418129382, -58.362886619968, 'approved'),
  ('Paulin', 'comida-rapida', 'Sarmiento 635, Cdad. Autónoma de Buenos Aires', 'https://drive.google.com/file/d/1cmvYSD2aFp3CIYoKYdf0HyhDuonKql61/view', -34.60448672612901, -58.3757146030019, 'approved'),
  ('Malas Hermanas', 'bodegon', 'Av. Hipólito Yrigoyen 782, Cdad. Autónoma de Buenos Aires', 'https://menu.fu.do/malashermanas/qr-menu', -34.60942941606586, -58.3774428134447, 'approved'),
  ('Starbucks', 'merienda', 'Reconquista 383, Cdad. Autónoma de Buenos Aires', 'https://www.starbucks.com.ar/menu', -34.60341878658055, -58.37238866454224, 'approved'),
  ('Rooftop Florida', 'bar', 'Florida 165, Cdad. Autónoma de Buenos Aires', 'https://borders.bistrosoft.com/menu?commerceId=11111436&menuUUID=bf724247-a3a2-4957-a776-5e419678be93', -34.60619982129207, -58.3750081177608, 'approved'),
  ('Burger King', 'comida-rapida', 'Perú 1, Cdad. Autónoma de Buenos Aires', 'https://www.burgerking.com.ar/en/menu#section-f0964fe0-63a9-40ec-be0c-10e3b5d93b42', -34.6081561811617, -58.37507551677856, 'approved'),
  ('Saint Elmo', 'bar', 'Perú 1118, Cdad. Autónoma de Buenos Aires', 'https://saintelmo.com.ar/nuestra-carta/', -34.62100378118674, -58.37408720793245, 'approved'),
  ('Pertutti', 'merienda', 'Av. Hipólito Yrigoyen 500, Cdad. Autónoma de Buenos Aires', 'https://micarrito.online/qr/pzamayo/carta.pdf', -34.60923765104482, -58.37333706567526, 'approved');

alter table public.restaurants enable trigger restaurants_before_insert;
