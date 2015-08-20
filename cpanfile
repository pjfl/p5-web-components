requires "Exporter::Tiny" => "0.042";
requires "HTTP::Message" => "6.06";
requires "Module::Pluggable" => "5.1";
requires "Moo" => "2.000001";
requires "Try::Tiny" => "0.22";
requires "Unexpected" => "v0.38.0";
requires "Web::ComposableRequest" => "v0.1.0";
requires "Web::Simple" => "0.030";
requires "namespace::autoclean" => "0.26";
requires "perl" => "5.010001";
requires "strictures" => "2";

on 'build' => sub {
  requires "Module::Build" => "0.4004";
  requires "Test::Requires" => "0.06";
  requires "version" => "0.88";
};

on 'test' => sub {
  requires "File::Spec" => "0";
  requires "Module::Metadata" => "0";
  requires "Sys::Hostname" => "0";
};

on 'test' => sub {
  recommends "CPAN::Meta" => "2.120900";
};

on 'configure' => sub {
  requires "Module::Build" => "0.4004";
  requires "version" => "0.88";
};
