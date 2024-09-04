DROP TABLE IF EXISTS config.RAPID_L4_jobs;
CREATE TABLE config.RAPID_L4_jobs (
	brand_name VARCHAR(50) NOT NULL,
	product_name VARCHAR(50) NOT NULL,
	target_date DATE NOT NULL,
	lang VARCHAR(5) NOT NULL,
	status ENUM('fresh', 'processing', 'error', 'exported', 'uploaded', 'archive') NOT NULL,
	when_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	when_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (brand_name, product_name, target_date, lang),
	FOREIGN KEY (brand_name) REFERENCES config.CORE_L2_brands(brand_name),
	FOREIGN KEY (product_name) REFERENCES config.CORE_L1_products(product_name),
	FOREIGN KEY (lang) REFERENCES config.CORE_L1_langs(lang)
);