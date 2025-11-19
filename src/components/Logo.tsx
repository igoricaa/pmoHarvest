import Image from "next/image";

const Logo = ({ theme }: { theme: string }) => {
	return (
		<Image
			src={theme === "dark" ? "/logo-white.svg" : "/logo-black.svg"}
			alt="PMOHive Logo"
			width={100}
			height={51}
			priority
			loading="eager"
			unoptimized
		/>
	);
};

export default Logo;
