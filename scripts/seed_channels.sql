-- Insertar canales por departamento si no existen
INSERT INTO channels (name, type)
SELECT 'Ventas', 'ventas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Ventas');

INSERT INTO channels (name, type)
SELECT 'Compliance', 'alertas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Compliance');

INSERT INTO channels (name, type)
SELECT 'Retention', 'general'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Retention');

INSERT INTO channels (name, type)
SELECT 'Líderes', 'alertas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Líderes');
